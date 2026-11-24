#!/usr/bin/env python3
"""Point the rest of the site at the Reading Room. Safe to run any number of times.

--homepage  index.html. The Mac rebuilds the homepage every morning; its daily job runs
            this right after the rebuild, and the hourly Reading Room job runs it too:
              * the nav's Research link opens /research/ instead of scrolling the page;
              * the footer gets a Reading Room link;
              * "Read on Substack" over the latest research becomes "Open the Reading Room";
              * research cards that point at a Substack post open its page here instead.
--static    start-here.html, framework.html, methodology.html. These are hand-built
            pages; the Mac's hourly Reading Room job runs this:
              * start-here's Research links open /research/;
              * framework and methodology get Research as the first nav item.

Only files whose text actually changes are written. Exit status 0 either way.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

POST = re.compile(r'href="https?://(?:lighthousemacro\.substack\.com|research\.lighthousemacro\.com)/p/([a-z0-9-]+)/?(?:\?[^"]*)?"')


def known_slugs(root: Path) -> set[str]:
    f = root / "research" / "posts.json"
    try:
        return {p["slug"] for p in json.loads(f.read_text(encoding="utf-8"))}
    except Exception:
        return set()


def patch_homepage(s: str, slugs: set[str]) -> str:
    # nav: Research opens the Reading Room
    def nav(m: re.Match) -> str:
        return m.group(0).replace('href="#research"', 'href="/research/"')
    s = re.sub(r'<nav id="site-nav".*?</nav>', nav, s, count=1, flags=re.S)
    # footer (and any other leftover): a labelled Reading Room link
    s = s.replace('<a href="#research">Research</a>', '<a href="/research/">Reading Room</a>')
    # the "more" link over the latest research
    s = re.sub(r'<a class="more" href="[^"]*">Read on Substack →</a>',
               '<a class="more" href="/research/">Open the Reading Room →</a>', s)
    # research cards: Substack post links open the on-site page when we have it
    if slugs:
        s = POST.sub(lambda m: f'href="/research/{m.group(1)}.html"' if m.group(1) in slugs else m.group(0), s)
    return s


def patch_start_here(s: str) -> str:
    return s.replace('href="index.html#research"', 'href="research/"')


def patch_nav_list(s: str) -> str:
    """framework.html / methodology.html: Research as the first item in the nav list."""
    m = re.search(r'(<ul class="nav-links">)(.*?)(</ul>)', s, flags=re.S)
    if not m or 'href="research/"' in m.group(2):
        return s
    first = re.search(r'\n(\s*)<li>', m.group(2))
    indent = first.group(1) if first else "        "
    item = f'\n{indent}<li><a href="research/">Research</a></li>'
    return s[:m.end(1)] + item + m.group(2) + s[m.start(3):]


def apply(path: Path, fn) -> bool:
    if not path.exists():
        return False
    old = path.read_text(encoding="utf-8")
    new = fn(old)
    if new != old:
        path.write_text(new, encoding="utf-8")
        return True
    return False


def main() -> int:
    ap = argparse.ArgumentParser(description="Point the site at the Reading Room.")
    ap.add_argument("--root", default=".", help="site repository root")
    ap.add_argument("--homepage", action="store_true", help="patch index.html")
    ap.add_argument("--static", action="store_true", help="patch the hand-built pages")
    a = ap.parse_args()
    root = Path(a.root).resolve()
    changed = []
    if a.homepage:
        slugs = known_slugs(root)
        if apply(root / "index.html", lambda s: patch_homepage(s, slugs)):
            changed.append("index.html")
    if a.static:
        if apply(root / "start-here.html", patch_start_here):
            changed.append("start-here.html")
        for name in ("framework.html", "methodology.html"):
            if apply(root / name, patch_nav_list):
                changed.append(name)
    print("site links: " + (", ".join(changed) + " updated" if changed else "already current"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
