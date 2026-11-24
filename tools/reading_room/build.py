#!/usr/bin/env python3
"""Build the Reading Room (research/), feed.xml and sitemap.xml from the Substack archive.

The Substack archive is the source of truth. Every published post gets a page at
/research/<slug>.html under the same slug Substack uses, so links never move.

Access rules, carried over from the Mac builder this replaces:
  * free posts (audience "everyone") publish in full, on the page and in the feed;
  * free-with-signup posts (audience "only_subscribers") show the public preview
    Substack itself serves, then a free sign-up box;
  * members posts (audience "only_paid") publish no body at all, carry noindex,
    and stay out of the sitemap. The feed carries their dek and a members link.

Exit codes: 0 built (or nothing changed); 2 partial archive; 3 a free post had no body;
4 Substack did not answer. On 2-4 nothing is written and the Mac's hourly job just tries again.

Guards: the build writes nothing unless the archive pull looks complete (at least
MIN_POSTS posts and at least 90% of what the last build published) and every free
body came back non-empty. A failed or partial pull leaves the live site alone.

Run from the repository root:
    python tools/reading_room/build.py --root . --cache .rr-cache
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path
from urllib.parse import quote, unquote
from zoneinfo import ZoneInfo

from bs4 import BeautifulSoup

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import pages  # noqa: E402  (sibling module)

PUB = "https://lighthousemacro.substack.com"
SITE = "https://lighthousemacro.com"
ET = ZoneInfo("America/New_York")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
MIN_POSTS = 50
FRESH_DAYS = 14  # bodies of posts younger than this are refetched every run, to pick up edits

S3 = re.compile(r"https(?::|%3A)(?://|%2F%2F)substack-post-media\.s3\.amazonaws\.com(?:/|%2F)[^\s\"'),]+", re.I)
CDN = "https://substackcdn.com/image/fetch/w_{w},c_limit,f_auto,q_auto:good,fl_progressive:steep/"
CROSSLINK = re.compile(r"https?://(?:research\.lighthousemacro\.com|lighthousemacro\.substack\.com)/p/([a-z0-9-]+)(?:[?#][^\"'\s<]*)?")
SERIES_DEK = re.compile(r"^\s*(lighthouse macro\s*[|·]\s*)?(the\s+)?(beacon|beam|horizon|chartbook|marginal matters|crosscurrents)\b.*\d{4}\s*$", re.I)
JUNK_DEK = re.compile(r"macro, illuminated|^(january|february|march|april|may|june|july|august|september|october|november|december) \d", re.I)
TAG_SERIES = [("Marginal Matters", "marginal"), ("Crosscurrents", "crosscurrents"), ("The Diagnostic Dozen", "dozen"),
              ("The Horizon", "horizon"), ("The Chartbook", "chartbook"), ("The Beacon", "beacon"),
              ("The Beam", "beam"), ("The Book", "crosscurrents")]
TEXT_SERIES = [("the beacon", "beacon"), ("the beam", "beam"), ("horizon", "horizon"),
               ("chartbook", "chartbook"), ("positioning update", "crosscurrents")]
DATELINE = re.compile(r"^(the\s+)?(beacon|beam|horizon|chartbook|marginal matters|crosscurrents)\s*[·|•–-]\s*[a-z]+\.?\s+(\d{1,2}(,\s*\d{4})?|\d{4})$", re.I)
BYLINE = re.compile(r"^by bob sheehan\b", re.I)
GATES = {"everyone": "free", "only_subscribers": "signup", "only_paid": "members"}


# ----------------------------------------------------------------------------- fetch
def get_json(url: str, tries: int = 4):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            last = e
            if e.code == 404:
                return None
        except Exception as e:  # network blips, timeouts
            last = e
        time.sleep(2 * (i + 1))
    raise RuntimeError(f"fetch failed after {tries} tries: {url}: {last}")


def fetch_archive() -> list[dict]:
    """Every published post, newest first, via the cursor-paged archive API."""
    posts, cursor, seen = [], None, set()
    for _ in range(200):
        url = f"{PUB}/api/v1/archive?sort=new&limit=20" + (f"&cursor={quote(cursor)}" if cursor else "")
        page = get_json(url)
        if isinstance(page, list):  # the pre-November shape, in case Substack reverts
            batch, cursor = page, None
        else:
            batch, cursor = (page or {}).get("posts") or [], (page or {}).get("nextCursor")
        for p in batch:
            if p.get("id") not in seen:
                seen.add(p.get("id"))
                posts.append(p)
        if not batch or not cursor:
            break
        time.sleep(0.4)
    return posts


def fetch_body(p: dict, cache: Path, now: datetime) -> str:
    """Body HTML for a free or signup post, cached by post id."""
    f = cache / f"{p['id']}.json"
    age_days = (now - parse_utc(p["post_date"])).days
    if f.exists() and age_days > FRESH_DAYS:
        try:
            c = json.loads(f.read_text())
            if c.get("post_date") == p["post_date"] and c.get("audience") == p["audience"] and c.get("body_html"):
                return c["body_html"]
        except Exception:
            pass
    full = get_json(f"{PUB}/api/v1/posts/{p['slug']}") or {}
    full = full.get("post", full)
    body = full.get("body_html") or ""
    if body.strip():
        cache.mkdir(parents=True, exist_ok=True)
        f.write_text(json.dumps({"post_date": p["post_date"], "audience": p["audience"], "body_html": body}))
    time.sleep(0.3)
    return body


# ----------------------------------------------------------------------------- model
def parse_utc(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc)


def img(url: str, w: int = 800) -> str:
    """Route an image through Substack's CDN at a web width, unwrapping any earlier CDN layer."""
    if not url:
        return ""
    m = S3.search(url)
    if m:
        raw = m.group(0)
        for _ in range(4):
            nxt = unquote(raw)
            if nxt == raw:
                break
            raw = nxt
        url = raw
    elif url.startswith("https://substackcdn.com/"):
        return url
    return CDN.format(w=w) + quote(url, safe="")


def s3_key(url: str) -> str:
    m = S3.search(url or "")
    return unquote(unquote(m.group(0))).rsplit("/", 1)[-1] if m else ""


def dek_for(p: dict) -> str:
    for k in ("search_engine_description", "subtitle", "description"):
        v = (p.get(k) or "").strip()
        if v and not SERIES_DEK.match(v) and not DATELINE.match(v) and "· FREE ·" not in v and not JUNK_DEK.search(v):
            return re.sub(r"\s+", " ", v)
    return ""


def series_for(p: dict, pinned: dict) -> str:
    if p["slug"] in pinned:
        return pinned[p["slug"]]
    tags = [t.get("name") for t in (p.get("postTags") or [])]
    for t, k in TAG_SERIES:
        if t in tags:
            return k
    s = f"{p.get('subtitle') or ''} {p.get('title') or ''}".lower()
    for pat, k in TEXT_SERIES:
        if pat in s:
            return k
    return "notes"


def model(raw: list[dict], cur: dict) -> list[dict]:
    exclude, pinned = set(cur.get("exclude", [])), cur.get("series", {})
    out = []
    for p in raw:
        if p["slug"] in exclude or p.get("type") not in (None, "newsletter"):
            continue
        dt = parse_utc(p["post_date"])
        out.append({
            "id": p["id"], "slug": p["slug"], "title": (p.get("title") or "Untitled").strip(),
            "dek": dek_for(p), "series": series_for(p, pinned),
            "gate": GATES.get(p.get("audience"), "members"), "audience": p.get("audience"),
            "post_date": p["post_date"],
            "date": dt.astimezone(ET).strftime("%Y-%m-%d"), "iso": dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "rfc822": format_datetime(dt), "img": p.get("cover_image") or "",
            "img_300": img(p.get("cover_image") or "", 300), "img_600": img(p.get("cover_image") or "", 600),
            "img_1200": img(p.get("cover_image") or "", 1200),
            "words": int(p.get("wordcount") or 0),
            "url": p.get("canonical_url") or f"{PUB}/p/{p['slug']}",
        })
    out.sort(key=lambda r: r["iso"], reverse=True)
    return out


# ----------------------------------------------------------------------------- body
KILL = ['p.button-wrapper', '[data-component-name="ButtonCreateButton"]', '[data-component-name="SubscribeWidget"]',
        '[data-component-name="SubscribeWidgetToDOM"]', '.subscribe-widget', '.subscription-widget-wrap',
        '.subscription-widget-wrap-editor', '.digest-post-embed', '.embedded-post-wrap', '.embedded-post',
        '.footer', '.paywall', '.paywall-jump', '[data-component-name="PaywallToDOM"]', '.image-link-expand',
        '.share-dialog', '.poll-embed', '[data-component-name="CaptionedButtonToDOM"]']
KEEP_ATTR = {"a": {"href"}, "img": {"src", "alt", "loading"}, "td": {"colspan", "rowspan"}, "th": {"colspan", "rowspan"},
             "iframe": {"src", "width", "height", "allowfullscreen", "frameborder"}, "ol": {"start"}}


# Bob, 11/24/2026: the term "institutional grade" is off the site everywhere, and that
# includes older pieces mirrored here. Drop the modifier and keep the sentence.
_INSTITUTIONAL_GRADE = re.compile(r"\b(I|i)nstitutional[-\s][Gg]rade\s+(\w)")


def drop_institutional_grade(text: str) -> str:
    return _INSTITUTIONAL_GRADE.sub(lambda m: m.group(2).upper() if m.group(1) == "I" else m.group(2), text)


def clean_body(raw: str, known: set[str]) -> tuple[str, str]:
    """Return (lead_quote_text, body_html) with Substack chrome removed and images on the CDN."""
    soup = BeautifulSoup(raw, "lxml")
    body = soup.body or soup
    for sel in KILL:
        for el in body.select(sel):
            el.decompose()
    for tag in body.find_all(["button", "svg", "form", "input", "script", "style", "noscript"]):
        tag.decompose()
    for a in body.find_all("a"):
        href = (a.get("href") or "").lower()
        if any(k in href for k in ("/subscribe", "/comments", "action=share", "/account")) and a.find("img") is None:
            a.decompose()

    for fig in body.find_all("figure"):
        im, cap = fig.find("img"), fig.find("figcaption")
        new = soup.new_tag("figure")
        if im is not None:
            ni = soup.new_tag("img", src=img(im.get("src", ""), 1456), loading="lazy")
            ni["alt"] = im.get("alt") or ""
            new.append(ni)
        if cap is not None and cap.get_text(strip=True):
            nc = soup.new_tag("figcaption")
            nc.string = cap.get_text(" ", strip=True)
            new.append(nc)
        if new.contents:
            fig.replace_with(new)
        else:
            fig.decompose()
    for im in body.find_all("img"):
        if not im.find_parent("figure"):
            im["src"] = img(im.get("src", ""), 1456)
            im["loading"] = "lazy"
            im["alt"] = im.get("alt") or ""
    for a in body.find_all("a"):  # unwrap the image links Substack wraps around every chart
        if a.find("img") is not None and not a.get_text(strip=True):
            a.unwrap()

    for tag in body.find_all(True):
        keep = KEEP_ATTR.get(tag.name, set())
        for attr in list(tag.attrs):
            if attr not in keep:
                del tag[attr]
    for a in body.find_all("a", href=True):
        m = CROSSLINK.fullmatch(a["href"])
        if m:
            a["href"] = f"/research/{m.group(1)}.html" if m.group(1) in known else "/research/"
        elif a["href"].startswith("http"):
            a["rel"] = "noopener"

    for p in body.find_all(["p", "h1", "h2", "h3", "h4", "h5", "h6"]):
        if not p.get_text(strip=True) and not p.find(["img", "iframe"]):
            p.decompose()
    lead = ""
    first = next((c for c in body.find_all(recursive=False) if c.name), None)
    if first is not None and first.name == "blockquote":
        lead = first.get_text(" ", strip=True)
        first.decompose()
    # drop the dateline and byline Substack posts open with; the page header already carries both
    while True:
        first = next((c for c in body.find_all(recursive=False) if c.name), None)
        if first is None:
            break
        text = first.get_text(" ", strip=True)
        if first.name == "hr" or (first.name != "figure" and len(text) < 70 and (DATELINE.match(text) or BYLINE.match(text))):
            first.decompose()
            continue
        break
    for d in body.find_all("div"):  # flatten the wrapper divs left behind
        d.unwrap()
    return drop_institutional_grade(lead), drop_institutional_grade("".join(str(c) for c in body.contents).strip())


def plain(html_text: str, n: int = 300) -> str:
    t = re.sub(r"\s+", " ", BeautifulSoup(html_text, "lxml").get_text(" ", strip=True))
    return (t[:n].rsplit(" ", 1)[0] + "...") if len(t) > n else t


def first_img_key(html_text: str) -> str:
    m = re.search(r'<img[^>]+src="([^"]+)"', html_text)
    return s3_key(m.group(1)) if m else ""


# ----------------------------------------------------------------------------- feed + sitemap
def x(s: str) -> str:
    return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def feed_contacts(old_feed: Path) -> str:
    """Carry the channel's contact lines over from the current feed unchanged."""
    if not old_feed.exists():
        return ""
    t = old_feed.read_text(encoding="utf-8")
    lines = [m.group(0) for tag in ("managingEditor", "webMaster")
             for m in [re.search(rf"<{tag}>[^<]*</{tag}>", t)] if m]
    return "".join(f"\n  {ln}" for ln in lines)


def feed_xml(posts: list[dict], contacts: str) -> str:
    items = []
    for p in posts:
        link = f"{SITE}/research/{p['slug']}.html"
        if p["gate"] == "free":
            body = p["body_abs"]
            desc = p["dek"] or plain(p["body"])
        elif p["gate"] == "signup":
            desc = p["dek"] or plain(p["body"])
            body = (f"<p>{x(desc)}</p><p><strong>Free with a subscription.</strong> "
                    f'<a href="{link}">Read the opening on our site</a>, or <a href="{p["url"]}">read it in full on Substack</a>.</p>')
        else:
            desc = p["dek"] or f"{pages.NAME[p['series']]} · members research"
            body = (f"<p>{x(desc)}</p><p><strong>Members research.</strong> Read it in full inside "
                    f'<a href="{pages.PHAROS}">Pharos</a>, or <a href="{x(pages.JOIN)}">join the Watch</a>.</p>')
        items.append(f"""  <item>
    <title>{x(p['title'])}</title>
    <link>{link}</link>
    <guid isPermaLink="true">{link}</guid>
    <pubDate>{p['rfc822']}</pubDate>
    <dc:creator>Bob Sheehan</dc:creator>
    <category>{x(pages.NAME[p['series']])}</category>
    <description>{x(desc)}</description>
    <content:encoded><![CDATA[{body.replace(']]>', ']]&gt;')}]]></content:encoded>
  </item>""")
    built = posts[0]["rfc822"]
    year = posts[0]["date"][:4]
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Lighthouse Macro</title>
  <link>{SITE}/research/</link>
  <atom:link href="{SITE}/feed.xml" rel="self" type="application/rss+xml"/>
  <description>Macro and economic intelligence, built on framework and process. Macro, Illuminated.</description>
  <language>en-us</language>
  <copyright>Copyright {year} Lighthouse Macro, LLC</copyright>{contacts}
  <lastBuildDate>{built}</lastBuildDate>
  <image><url>{SITE}/og-image.png</url><title>Lighthouse Macro</title><link>{SITE}/research/</link></image>
{chr(10).join(items)}
</channel>
</rss>
"""


STATIC_URLS = [("/", "daily", "1.0"), ("/research/", "daily", "0.9"), ("/pharos/", "monthly", "0.8"),
               ("/start-here.html", "monthly", "0.8"), ("/framework.html", "monthly", "0.8"),
               ("/methodology.html", "monthly", "0.6")]


def sitemap_xml(posts: list[dict]) -> str:
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, cf, pr in STATIC_URLS:
        out.append(f"  <url><loc>{SITE}{loc}</loc><changefreq>{cf}</changefreq><priority>{pr}</priority></url>")
    for p in posts:
        if p["gate"] == "members":
            continue  # members pages are noindex
        out.append(f"  <url><loc>{SITE}/research/{p['slug']}.html</loc><lastmod>{p['date']}</lastmod>"
                   f"<changefreq>monthly</changefreq><priority>0.7</priority></url>")
    out.append("</urlset>")
    return "\n".join(out) + "\n"


# ----------------------------------------------------------------------------- main
def write(path: Path, text: str) -> bool:
    if path.exists() and path.read_text(encoding="utf-8") == text:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return True


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--root", default=".", help="site repository root")
    ap.add_argument("--cache", default=".rr-cache", help="body cache directory")
    ap.add_argument("--archive", help="read the archive from this JSON file instead of the API (testing)")
    args = ap.parse_args()
    root, cache = Path(args.root).resolve(), Path(args.cache).resolve()
    rdir = root / "research"
    now = datetime.now(timezone.utc)
    cur = json.loads((HERE / "curation.json").read_text())

    try:
        raw = json.loads(Path(args.archive).read_text()) if args.archive else fetch_archive()
    except RuntimeError as e:
        print(f"!! Substack did not answer ({e}). Writing nothing.")
        return 4
    posts = model(raw, cur)
    prev = 0
    if (rdir / "posts.json").exists():
        try:
            prev = len(json.loads((rdir / "posts.json").read_text()))
        except Exception:
            prev = 0
    if len(posts) < MIN_POSTS or len(posts) < 0.9 * prev:
        print(f"!! archive pull looks partial ({len(posts)} posts; last build had {prev}). Writing nothing.")
        return 2

    known = {p["slug"] for p in posts}
    for p in posts:
        p["body"], p["body_abs"], p["lead"], p["cover_in_body"] = "", "", "", False
        if p["gate"] == "members":
            continue
        try:
            lead, body = clean_body(fetch_body(p, cache, now), known)
        except RuntimeError as e:
            print(f"!! Substack did not answer for {p['slug']} ({e}). Writing nothing.")
            return 4
        if not body.strip():
            print(f"!! {p['slug']}: a free post came back with no body. Writing nothing.")
            return 3
        p["lead"], p["body"] = lead, body
        p["body_abs"] = body.replace('href="/research/', f'href="{SITE}/research/')
        if not p["dek"] and lead:
            p["dek"] = lead
        p["cover_in_body"] = bool(p["img"]) and s3_key(p["img"]) == first_img_key(body)

    changed = []
    for p in posts:
        if write(rdir / f"{p['slug']}.html", pages.article(p, posts)):
            changed.append(f"research/{p['slug']}.html")
    keep = {f"{p['slug']}.html" for p in posts} | {"index.html"}
    for f in sorted(rdir.glob("*.html")):
        if f.name not in keep:
            f.unlink()
            changed.append(f"research/{f.name} (removed)")
    manifest = [{k: p[k] for k in ("slug", "title", "dek", "series", "gate", "date", "words")} | {"img": p["img_600"]}
                for p in posts]
    outputs = (("research/index.html", pages.index(posts)),
               ("research/reader.css", (HERE / "reader.css").read_text(encoding="utf-8")),
               ("research/posts.json", json.dumps(manifest, indent=1, ensure_ascii=False) + "\n"),
               ("feed.xml", feed_xml(posts, feed_contacts(root / "feed.xml"))),
               ("sitemap.xml", sitemap_xml(posts)))
    for rel, text in outputs:
        if write(root / rel, text):
            changed.append(rel)

    counts = {g: sum(p["gate"] == g for p in posts) for g in ("free", "signup", "members")}
    print(f"Reading Room: {len(posts)} posts ({counts['free']} free, {counts['signup']} free with sign-up, "
          f"{counts['members']} members); newest {posts[0]['date']} {posts[0]['title']!r}")
    print(f"{len(changed)} file(s) changed" + "".join(f"\n  {c}" for c in changed[:40]) + ("\n  ..." if len(changed) > 40 else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
