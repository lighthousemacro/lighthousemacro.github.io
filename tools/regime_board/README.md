# Live Regime Board scoring

Sets the word and colour on each of the twelve homepage tiles. The Mac's 07:45 job
(LHM `Scripts/website/publish_site_daily.sh`) renders `index.html`, then runs `board.py`
against `Lighthouse_Master.db`. The Mac pulls this repository first, so edits here take
effect at the next morning's build.

## The rule

Each pillar composite is restated as a z-score against its own full history,
`(latest - mean) / standard deviation`, then every tile uses the same bands:

| Own-history z | Band | Tile colour | Word |
| --- | --- | --- | --- |
| below 1 in absolute value | normal | light sky | the pillar's calm word |
| 1 to 2 | elevated | sky | a directional word |
| 2 or more | extreme | dusk | the strong word |

Own history, because the composites are sums of z-scores and their spreads differ. On raw
values Trade (TCI) sat beyond ±1 in 61% of months and Labor (LFI) in 2%. Restated, every pillar
sits beyond ±1 in 20% to 40% of months, against 32% for a true z-score.

The words for each pillar are the `PILLARS` table in `board.py`. Only the public board uses
them; Pharos, the morning brief and the alerts keep the status ladders in LHM
`Scripts/data_pipeline/compute_indices.py`.

## Running it

```
python3 tools/regime_board/board.py --db ~/LHM/Data/databases/Lighthouse_Master.db --report
python3 tools/regime_board/board.py --db ~/LHM/Data/databases/Lighthouse_Master.db --page index.html
```

`--report` prints the twelve scores and changes nothing. If the live database is busy it reads
the newest backup beside it. If a pillar has no history, or a tile or the legend is missing
from the page, it changes nothing and exits 1, and the morning job publishes nothing that day.
