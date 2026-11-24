# Reading Room builder

Builds https://lighthousemacro.com/research/ from the Substack archive, every hour, in GitHub Actions
(`.github/workflows/reading-room.yml`). New Substack posts show up within the hour; nobody runs anything.

| File | What it does |
| --- | --- |
| `build.py` | Pulls the archive, writes `research/` (index, one page per post, `reader.css`, `posts.json`), `feed.xml` and `sitemap.xml` |
| `pages.py` | The HTML: the index (layout B, "The Index") and the article page |
| `reader.css` | Styles for both. Copied to `research/reader.css` on every build |
| `curation.json` | Hand curation: posts kept off the site, and posts whose series is pinned by hand |
| `site_links.py` | Points the rest of the site at the Reading Room (`--homepage` for the Mac, `--static` for the cloud) |
| `mac-handoff.txt` | Written by the Mac's daily job. Until it exists the hourly job commits nothing |

## Who owns which file

The hourly job owns `research/`, `feed.xml`, `sitemap.xml`, and the Reading Room links in
`start-here.html`, `framework.html` and `methodology.html`. The Mac's 07:45 job owns `index.html`
and never touches the files above, so the two never collide on a push.

## Access rules

* Free posts publish in full, on the page and in the feed.
* Free-with-sign-up posts show the public preview Substack serves, then a free sign-up box.
* Members posts publish no body, carry `noindex`, and stay out of the sitemap.

## Series

A post's series comes from its Substack tag (The Beacon, The Beam, The Horizon, The Chartbook,
Marginal Matters, Crosscurrents, The Book, The Diagnostic Dozen), then its subtitle, then Notes.
To move a post by hand, add `"slug": "series"` under `series` in `curation.json`. To hide one,
add its slug to `exclude`.

## Run it locally

```
pip install -r tools/reading_room/requirements.txt
python tools/reading_room/build.py --root . --cache .rr-cache
python tools/reading_room/site_links.py --root . --static
```

The build refuses to write anything if the archive pull looks partial (under 50 posts, or under
90% of the last build) or a free post comes back empty.
