# lighthousemacro.com

Source for the public site. GitHub Pages serves this repository at https://lighthousemacro.com (`CNAME`).

`index.html` is the homepage. A publishing day is a commit on `main`. This README is not part of the rendered site.

The research database, API keys, and draft client work do not belong here. Those stay in the private LHM repository.

| Path | Role |
| --- | --- |
| `index.html` | Homepage. Rebuilt by the Mac's 07:45 job (LHM `Scripts/website/publish_site_daily.sh`) |
| `framework.html`, `methodology.html`, `start-here.html` | The public framework |
| `research/` | The Reading Room. Built every hour from Substack by `tools/reading_room/`, run by the Mac; do not edit by hand |
| `pharos/` | Pharos pages on the site |
| `articles/`, `social/` | Published pieces and social charts |
| `feed.xml`, `sitemap.xml` | Feeds. Built with the Reading Room |
| `tools/reading_room/` | The Reading Room builder. The Mac runs it hourly (LHM `Scripts/website/publish_reading_room.sh`) |
| `tools/regime_board/` | Scores the homepage regime board tiles against each pillar's own history. The Mac's 07:45 job runs it after rebuilding `index.html` |
