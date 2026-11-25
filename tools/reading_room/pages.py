"""HTML for the Reading Room: the index (layout B, "The Index") and one page per post.

Shared chrome (nav, footer) mirrors the homepage so the Reading Room reads as the
same site. Styles live in reader.css next to this file; the build copies it to
research/reader.css.
"""
from __future__ import annotations

import html
import json
import math
from collections import OrderedDict
from datetime import datetime

E = html.escape
SITE = "https://lighthousemacro.com"
PHAROS = "https://pharos.lighthousemacro.com"
JOIN = ("https://lighthousemacro.substack.com/subscribe?plan=yearly&utm_source=lhm_site"
        "&utm_medium=cta&utm_campaign=reading_room")
SIGNUP = "https://lighthousemacro.substack.com/subscribe?utm_source=lhm_site&utm_medium=cta&utm_campaign=reading_room"

SERIES = [  # key, name, short chip label, one-line description
    ("beacon", "The Beacon", "Beacon", "Long-form. One thesis, taken all the way down."),
    ("beam", "The Beam", "Beam", "The tactical read on the print that just hit."),
    ("horizon", "The Horizon", "Horizon", "The forward view, and where the risk sits."),
    ("chartbook", "The Chartbook", "Chartbook", "The cycle, chart by chart."),
    ("marginal", "Marginal Matters", "Marginal Matters", "One mechanic, walked through our data. Free."),
    ("crosscurrents", "Crosscurrents", "Crosscurrents", "The book, in the open."),
    ("dozen", "The Diagnostic Dozen", "Diagnostic Dozen", "Twelve pillars, three engines. The method itself."),
    ("notes", "Notes", "Notes", "Dispatches and one-offs from the archive."),
]
NAME = {k: n for k, n, _s, _b in SERIES}
SHORT = {k: s for k, _n, s, _b in SERIES}
BLURB = {k: b for k, _n, _s, b in SERIES}

MARK = ('<svg class="mark" viewBox="590 288 416 1024" aria-hidden="true"><path d="M794 293L950 405V435H638V405Z"/>'
        '<path d="M674 478H709V581H879V478H915V628H975V672H617V628H674Z"/><path d="M661 711H932L928 753L635 890Z"/>'
        '<path d="M954 897L970 1051L596 1232L617 1064Z"/><path d="M989 1203L1001 1307H786Z"/></svg>')
WORDMARK = f'<a class="wm" href="/" aria-label="Lighthouse Macro home">{MARK}<span>LIGHTHOUSE <b>MACRO</b></span></a>'
DISCLAIMER = ("© {year} Lighthouse Macro, LLC. Lighthouse Macro, LLC provides research and advisory services that are "
              "informational and educational in nature. Nothing published or communicated by Lighthouse Macro constitutes "
              "personalized investment advice, a solicitation, or a recommendation to buy, sell, or hold any security. All "
              "investment decisions are the sole responsibility of the reader or client. Past performance is not indicative "
              "of future results. Lighthouse Macro, LLC is not a registered investment advisor.")


def d_long(s: str) -> str:
    return datetime.strptime(s, "%Y-%m-%d").strftime("%B %-d, %Y")


def d_short(s: str) -> str:
    return datetime.strptime(s, "%Y-%m-%d").strftime("%b %-d")


def badge(p: dict, dark: bool = False) -> str:
    if p["gate"] == "members":
        return '<span class="bdg mem">Members</span>'
    return '<span class="bdg free">Free</span>'


def read_time(words: int) -> str:
    return f"{max(1, math.ceil(words / 230))} min read" if words else ""


def head(title: str, desc: str, canonical: str, og_img: str, og_type: str, extra: str = "") -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{canonical}">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}">
<meta property="og:image" content="{E(og_img)}">
<meta property="og:url" content="{canonical}">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="Lighthouse Macro">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@LHMacro">
<link rel="alternate" type="application/rss+xml" title="Lighthouse Macro" href="{SITE}/feed.xml">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<meta name="theme-color" content="#123456">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="/assets/tokens.css">
<link rel="stylesheet" href="/research/reader.css">{extra}
</head>
<body>
<header class="nav"><div class="wrap">
  {WORDMARK}
  <nav id="site-nav" aria-label="Site"><a class="on" href="/research/" aria-current="page">Research</a><a href="/#framework">Framework</a><a href="/#pharos">Pharos</a><a href="/#services">Services</a><a href="/#pricing">Pricing</a><a href="/#about">About</a><a class="signin-m" href="{PHAROS}">Sign in to Pharos</a><a class="btn btn-dusk" href="{E(JOIN)}">Join the Watch · $500/yr</a></nav>
  <button class="menu" type="button" aria-expanded="false" aria-controls="site-nav"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>Menu</button>
  <div class="right"><a class="signin" href="{PHAROS}">Sign in</a><a class="btn btn-dusk" href="{E(JOIN)}">Get Research + Pharos<span class="nav-price"> · $500/yr</span></a></div>
</div>
<script>(function(){{var b=document.querySelector('.nav .menu');if(!b)return;b.addEventListener('click',function(){{var o=b.closest('.nav').classList.toggle('open');b.setAttribute('aria-expanded',o?'true':'false');}});}})();</script>
</header>
<div class="bar"></div>
"""


def foot(year: str, js: str = "") -> str:
    return f"""<footer><div class="wrap">
  <div class="top">{WORDMARK}
    <span class="tag"><span style="color:var(--light-sky);">MACRO,</span> <span style="color:var(--dusk);">ILLUMINATED.</span></span>
    <div class="links"><a href="/">Lighthouse Macro</a><a href="/research/">Reading Room</a><a href="{PHAROS}">Pharos</a><a href="/start-here.html">Start here</a><a href="/feed.xml">RSS</a><a href="https://x.com/LHMacro">@LHMacro</a></div>
  </div>
  <p>{DISCLAIMER.format(year=year)}</p>
</div></footer>
{js}</body>
</html>
"""


# ----------------------------------------------------------------------------- index (layout B)
INDEX_JS = """<script>
(function(){
  /* Newest 20 first, "Load more" for the next 20. Series, Free only and search always
     cover the whole archive; changing any of them starts again from the newest 20.
     Without JavaScript every row stays visible and the button stays hidden. */
  var PAGE=20,lim=PAGE,s='all',fo=document.getElementById('fo'),q=document.getElementById('q'),none=document.getElementById('none');
  var lm=document.getElementById('lm'),cnt=document.getElementById('cnt'),mw=document.getElementById('mw');
  var chips=[].slice.call(document.querySelectorAll('.chip'));
  function run(reset){
    if(reset)lim=PAGE;
    var t=q.value.trim().toLowerCase(),total=0;
    document.querySelectorAll('.grp').forEach(function(g){
      var n=0;
      g.querySelectorAll('.row').forEach(function(r){
        var ok=(s==='all'||r.dataset.s===s)&&(!fo.checked||r.dataset.f==='1')&&(!t||r.dataset.t.indexOf(t)>-1);
        if(ok)total++;
        var show=ok&&total<=lim;
        r.hidden=!show;if(show)n++;
      });
      g.hidden=!n;
    });
    none.hidden=total>0;
    var shown=Math.min(total,lim),left=total-shown;
    mw.hidden=!total;
    cnt.textContent='Showing '+shown+' of '+total;
    lm.hidden=!left;
    lm.textContent='Load '+Math.min(PAGE,left)+' more';
  }
  function pick(k,push){
    if(!chips.some(function(c){return c.dataset.s===k;}))k='all';
    s=k;
    chips.forEach(function(c){var on=c.dataset.s===k;c.classList.toggle('on',on);c.setAttribute('aria-pressed',on?'true':'false');});
    if(push&&history.replaceState)history.replaceState(null,'',k==='all'?location.pathname:'#'+k);
    run(true);
  }
  chips.forEach(function(c){c.addEventListener('click',function(){pick(c.dataset.s,true);});});
  fo.addEventListener('change',function(){run(true);});q.addEventListener('input',function(){run(true);});
  lm.addEventListener('click',function(){lim+=PAGE;run(false);});
  window.addEventListener('hashchange',function(){pick(location.hash.slice(1),false);});
  pick(location.hash.slice(1)||'all',false);
})();
</script>
"""


def index(posts: list[dict]) -> str:
    n = len(posts)
    first = min(p["date"] for p in posts)
    since = datetime.strptime(first, "%Y-%m-%d").strftime("%B %Y")
    f = posts[0]
    counts = {k: sum(p["series"] == k for p in posts) for k, *_ in SERIES}
    desc = (f"Every piece Lighthouse Macro has published, {n} since {since}: The Beacon, The Beam, The Horizon, "
            "The Chartbook, Marginal Matters and the Diagnostic Dozen.")
    ld = {"@context": "https://schema.org", "@type": "CollectionPage", "name": "The Reading Room",
          "url": f"{SITE}/research/", "description": desc,
          "publisher": {"@type": "Organization", "name": "Lighthouse Macro", "url": SITE}}
    extra = f'\n<script type="application/ld+json">{json.dumps(ld)}</script>'
    out = [head("The Reading Room | Lighthouse Macro", desc, f"{SITE}/research/", f"{SITE}/og-image.png", "website", extra)]
    feat_img = f'<span class="thumb"><img src="{E(f["img_600"])}" alt=""></span>' if f["img_600"] else ""
    out.append(f"""<section class="rr-hd"><div class="wrap">
  <div class="eyebrow">// The Reading Room</div>
  <h1>Everything we have published.</h1>
  <p class="lede">{n} pieces since {since}. Free pieces read in full here; members pieces open in full inside Pharos. New work lands here the day it publishes.</p>
  <a class="feat" href="/research/{f['slug']}.html">{feat_img}<span class="fb">
    <span class="k"><span class="ser">Latest · {E(NAME[f['series']])}</span><span class="d">{d_long(f['date'])}</span>{badge(f)}</span>
    <span class="h">{E(f['title'])}</span>{f'<span class="p">{E(f["dek"])}</span>' if f['dek'] else ''}<span class="go">Read →</span>
  </span></a>
</div></section>
<div class="tools"><div class="wrap">
  <div class="chips" role="group" aria-label="Filter by series"><button class="chip on" type="button" data-s="all" aria-pressed="true">All<em>{n}</em></button>""")
    for k, *_ in SERIES:
        if counts[k]:
            out.append(f'<button class="chip" type="button" data-s="{k}" aria-pressed="false">{E(SHORT[k])}<em>{counts[k]}</em></button>')
    out.append("""</div>
  <div class="srch"><label><input type="checkbox" id="fo"> Free only</label><input id="q" type="search" placeholder="Search titles" aria-label="Search titles"></div>
</div></div>
<main class="wrap rr-list" id="list">
""")
    groups: "OrderedDict[str, list]" = OrderedDict()
    for p in posts:
        groups.setdefault(p["date"][:7], []).append(p)
    for ym, ps in groups.items():
        label = datetime.strptime(ym, "%Y-%m").strftime("%B %Y")
        out.append(f'<section class="grp"><h2 class="mo">{label}</h2>\n')
        for p in ps:
            dek = f'<span class="dk">{E(p["dek"])}</span>' if p["dek"] else ""
            thumb = f'<span class="thumb"><img src="{E(p["img_300"])}" alt="" loading="lazy"></span>' if p["img_300"] else '<span class="thumb ph"></span>'
            title_key = E(f"{p['title']} {NAME[p['series']]}".lower())
            out.append(f'<a class="row" href="/research/{p["slug"]}.html" data-s="{p["series"]}" data-f="{int(p["gate"] != "members")}" data-t="{title_key}">'
                       f'<span class="d">{d_short(p["date"])}</span><span class="ser">{E(NAME[p["series"]])}</span>'
                       f'<span class="t"><span class="h">{E(p["title"])}</span>{dek}</span>'
                       f'<span class="b">{badge(p)}</span>{thumb}</a>\n')
        out.append("</section>\n")
    out.append('<p class="none" id="none" hidden>Nothing matches. Clear the search or pick another series.</p>\n'
               '<div class="lm" id="mw" hidden><p class="cnt" id="cnt" aria-live="polite"></p>'
               '<button class="btn btn-line" id="lm" type="button" hidden>Load 20 more</button></div>\n</main>\n')
    out.append(foot(posts[0]["date"][:4], INDEX_JS))
    return "".join(out)


# ----------------------------------------------------------------------------- article
def gate_box(p: dict) -> str:
    if p["gate"] == "members":
        return f"""<aside class="gate">
  <div class="eyebrow">// Members research</div>
  <h2>This piece is for members.</h2>
  <p>Members research lives inside Pharos, in full, alongside the live dashboards. It is not published on the open site.</p>
  <div class="ctas"><a class="btn btn-dusk" href="{E(JOIN)}">Join the Watch · $500/yr</a><a class="btn btn-line" href="{PHAROS}">Open Pharos →</a></div>
  <p class="small">Already a subscriber? <a href="{E(p['url'])}">Read it on Substack</a>.</p>
</aside>"""
    if p["gate"] == "signup":
        return f"""<aside class="gate">
  <div class="eyebrow">// Free with a subscription</div>
  <h2>The rest of this piece is free to subscribers.</h2>
  <p>Subscribe free and the full piece opens on Substack, along with every free piece we publish.</p>
  <div class="ctas"><a class="btn btn-dusk" href="{E(SIGNUP)}">Subscribe free</a><a class="btn btn-line" href="{E(p['url'])}">Read it on Substack →</a></div>
</aside>"""
    return f"""<aside class="gate end">
  <div class="eyebrow">// Keep reading</div>
  <h2>Get every piece, and Pharos with it.</h2>
  <p>The Watch is the full research: every Beacon, Beam, Horizon and Chartbook, plus the live dashboards in Pharos.</p>
  <div class="ctas"><a class="btn btn-dusk" href="{E(JOIN)}">Join the Watch · $500/yr</a><a class="btn btn-line" href="{E(SIGNUP)}">Get the free pieces</a></div>
</aside>"""


def article(p: dict, posts: list[dict]) -> str:
    url = f"{SITE}/research/{p['slug']}.html"
    desc = p["dek"] or f"{NAME[p['series']]} from Lighthouse Macro, {d_long(p['date'])}."
    og = p["img_1200"] or f"{SITE}/og-image.png"
    ld = {"@context": "https://schema.org", "@type": "Article", "headline": p["title"], "description": desc,
          "datePublished": p["iso"], "url": url, "mainEntityOfPage": url, "image": og,
          "isAccessibleForFree": p["gate"] != "members", "articleSection": NAME[p["series"]],
          "author": {"@type": "Person", "name": "Bob Sheehan", "honorificSuffix": "CFA, CMT",
                     "jobTitle": "Founder, Chief Economist & Macro Strategist", "url": f"{SITE}/#about"},
          "publisher": {"@type": "Organization", "name": "Lighthouse Macro", "url": SITE,
                        "logo": {"@type": "ImageObject", "url": f"{SITE}/android-chrome-512x512.png"}}}
    if p["words"]:
        ld["wordCount"] = p["words"]
    extra = (('\n<meta name="robots" content="noindex">' if p["gate"] == "members" else "")
             + f'\n<meta property="article:published_time" content="{p["iso"]}">'
             + f'\n<script type="application/ld+json">{json.dumps(ld)}</script>')
    out = [head(f"{p['title']} | Lighthouse Macro", desc, url, og, "article", extra)]
    meta = [f'<span>{d_long(p["date"])}</span>']
    if read_time(p["words"]):
        meta.append(f"<span>{read_time(p['words'])}</span>")
    out.append(f"""<article class="art">
<header class="ah"><div class="col">
  <div class="crumb"><a href="/research/">← Reading Room</a><a class="ser" href="/research/#{p['series']}">{E(NAME[p['series']])}</a></div>
  <h1>{E(p['title'])}</h1>
  {f'<p class="dek">{E(p["dek"])}</p>' if p['dek'] else ''}
  <div class="by"><span class="who">Bob Sheehan, CFA, CMT</span>{''.join(meta)}{badge(p)}</div>
</div></header>
""")
    if p["img_1200"] and p["gate"] != "members" and not p.get("cover_in_body"):
        out.append(f'<figure class="cover"><img src="{E(p["img_1200"])}" alt=""></figure>\n')
    if p["body"]:
        cls = "prose preview" if p["gate"] == "signup" else "prose"
        out.append(f'<div class="{cls}">\n{p["body"]}\n</div>\n')
    out.append(f'<div class="col">{gate_box(p)}</div>\n')
    more = [q for q in posts if q["series"] == p["series"] and q["slug"] != p["slug"]][:3]
    if len(more) < 3:
        more += [q for q in posts if q["slug"] != p["slug"] and q not in more][: 3 - len(more)]
    out.append(f'<section class="more"><div class="wrap"><div class="mh"><h2>More from {E(NAME[p["series"]])}</h2>'
               f'<a href="/research/#{p["series"]}">All {E(SHORT[p["series"]])} →</a></div><div class="cards">')
    for q in more:
        th = f'<span class="thumb"><img src="{E(q["img_600"])}" alt="" loading="lazy"></span>' if q["img_600"] else '<span class="thumb ph"></span>'
        out.append(f'<a class="cd" href="/research/{q["slug"]}.html">{th}<span class="m"><span class="d">{d_long(q["date"])}</span>{badge(q)}</span>'
                   f'<span class="h">{E(q["title"])}</span></a>')
    out.append("</div></div></section>\n</article>\n")
    out.append(foot(p["date"][:4]))
    return "".join(out)
