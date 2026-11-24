#!/usr/bin/env python3
"""Score the homepage Live Regime Board against each pillar's own history.

The Mac's 07:45 job renders index.html with the twelve pillar tiles, then runs this to set
each tile's word and colour from the latest reading in Lighthouse_Master.db.

Why own history. The twelve composites are sums of z-scores, not z-scores, so their spreads
differ: since inception Trade (TCI) sat beyond +/-1 in 61% of months and Labor (LFI) in 2%.
Fixed cut-offs on the raw numbers made the noisy pillars shout every day and the quiet ones
never speak. Each reading is restated as a z-score against its own full history,
z = (value - mean) / standard deviation, and every tile uses the same bands:

    |z| < 1        normal     the pillar's calm word, light sky
    1 <= |z| < 2   elevated   a directional word, sky
    |z| >= 2       extreme    the strong word, dusk

Only the public board uses these words. Pharos, the morning brief and the alerts keep the
status ladders in LHM compute_indices.py.

Run:   python3 board.py --db /Users/bob/LHM/Data/databases/Lighthouse_Master.db --page index.html
       python3 board.py --db ... --report     # print today's scores, change nothing
Exit:  0 board written (or already current), 1 anything missing (the page is left as it was).
"""
from __future__ import annotations

import argparse
import math
import re
import sqlite3
import statistics
import sys
from pathlib import Path

NORMAL = 1.0   # |z| below this is ordinary
EXTREME = 2.0  # |z| at or above this is extreme

# (tile number, tile name, index_id, words from very low to very high:
#  (extreme low, elevated low, normal, elevated high, extreme high))
# The words follow what a HIGH reading means for each composite:
#   LFI high = fragile labor, PCI high = hot prices, TCI high = weaker dollar (tailwind),
#   FPI high = fiscal strain, FCI high = loose conditions, SPI high = fear.
PILLARS = [
    (1, "Labor", "LFI", ("VERY STRONG", "STRONG", "STEADY", "FRAGILE", "BREAKING")),
    (2, "Prices", "PCI", ("DEFLATIONARY", "COOLING", "ON TARGET", "HOT", "INFLATION SHOCK")),
    (3, "Growth", "GCI", ("CONTRACTION", "BELOW TREND", "AT TREND", "ABOVE TREND", "BOOM")),
    (4, "Housing", "HCI", ("SLUMP", "WEAK", "STEADY", "STRONG", "BOOM")),
    (5, "Consumer", "CCI", ("DISTRESSED", "STRESSED", "STEADY", "STRONG", "BOOM")),
    (6, "Business", "BCI", ("CONTRACTION", "SLOWING", "STEADY", "EXPANDING", "BOOM")),
    (7, "Trade", "TCI", ("DOLLAR SQUEEZE", "DOLLAR HEADWIND", "NEUTRAL", "DOLLAR TAILWIND", "DOLLAR SLIDE")),
    (8, "Government", "FPI", ("FISCAL STRENGTH", "HEALTHY", "NORMAL", "STRAINED", "FISCAL STRESS")),
    (9, "Financial", "FCI", ("SEVERELY TIGHT", "TIGHT", "NEUTRAL", "LOOSE", "VERY LOOSE")),
    (10, "Plumbing", "LCI", ("STRESSED", "SCARCE", "ADEQUATE", "AMPLE", "ABUNDANT")),
    (11, "Market Structure", "MSI", ("BREAKDOWN", "BEARISH", "MIXED", "BULLISH", "STRONG UPTREND")),
    (12, "Sentiment", "SPI", ("EUPHORIA", "COMPLACENT", "NEUTRAL", "FEARFUL", "CAPITULATION")),
]

LEGEND = ('<div class="legend">'
          '<span><i style="background:var(--light-sky)"></i>|z| &lt; 1 normal</span>'
          '<span><i style="background:var(--sky)"></i>1 to 2 elevated</span>'
          '<span><i style="background:var(--dusk)"></i>2+ extreme</span>'
          '<span>each pillar against its own history</span>'
          '<a href="methodology.html">How we build it →</a></div>')

TILE = re.compile(r'<div class="tile (?:calm|watch|alert)"><span class="n">(\d\d)</span>'
                  r'<span class="p">([^<]*)</span><span class="s">[^<]*</span></div>')
LEGEND_RE = re.compile(r'<div class="legend">.*?</div>', re.S)


def score(value: float, mean: float, sd: float, words: tuple[str, ...]) -> tuple[float, str, str]:
    """(own-history z, tone class, word) for one reading."""
    z = (value - mean) / sd
    a = abs(z)
    if a < NORMAL:
        return z, "calm", words[2]
    if a < EXTREME:
        return z, "watch", words[3] if z > 0 else words[1]
    return z, "alert", words[4] if z > 0 else words[0]


def _rows(db: Path, extra: str = "") -> list[tuple]:
    ids = [p[2] for p in PILLARS]
    con = sqlite3.connect(f"file:{db}?mode=ro{extra}", uri=True, timeout=60)
    try:
        return con.execute(
            f"SELECT index_id, date, value FROM lighthouse_indices "
            f"WHERE index_id IN ({','.join('?' * len(ids))}) AND value IS NOT NULL "
            f"ORDER BY index_id, date", ids).fetchall()
    finally:
        con.close()


def load(db: Path) -> dict[str, dict]:
    """Latest reading plus full-history mean and standard deviation, per board index.

    Reads the live database. If the pipeline holds it mid-write, falls back to the newest
    backup beside it (opened immutable), the same order the homepage build uses.
    """
    try:
        rows = _rows(db)
        print("INFO: regime board read from live")
    except sqlite3.Error as e:
        backups = sorted((db.parent / "backups").glob("Lighthouse_Master_*.db"))
        if not backups:
            raise SystemExit(f"!! database unreadable ({e}) and no backup; board left as it was")
        rows = _rows(backups[-1], "&immutable=1")
        print(f"INFO: regime board read from backup ({backups[-1].name}); live was busy: {e}")
    hist: dict[str, list[tuple[str, float]]] = {}
    for idx, date, value in rows:
        v = float(value)
        if math.isfinite(v):
            hist.setdefault(idx, []).append((date, v))
    out = {}
    for idx, pts in hist.items():
        vals = [v for _, v in pts]
        if len(vals) < 2:
            continue
        out[idx] = {"date": pts[-1][0], "value": vals[-1],
                    "mean": statistics.fmean(vals), "sd": statistics.stdev(vals), "n": len(vals)}
    return out


def readings(stats: dict[str, dict]) -> list[dict]:
    board = []
    for n, name, idx, words in PILLARS:
        s = stats.get(idx)
        if not s or not s["sd"] > 0:
            raise SystemExit(f"!! no usable history for {idx} ({name}); board left as it was")
        z, tone, word = score(s["value"], s["mean"], s["sd"], words)
        board.append({"n": f"{n:02d}", "name": name, "idx": idx, "date": s["date"], "value": s["value"],
                      "mean": s["mean"], "sd": s["sd"], "z": z, "tone": tone, "word": word})
    return board


def patch(html: str, board: list[dict]) -> str:
    by_n = {b["n"]: b for b in board}
    seen = set()

    def tile(m: re.Match) -> str:
        b = by_n.get(m.group(1))
        if not b:
            return m.group(0)
        seen.add(b["n"])
        return (f'<div class="tile {b["tone"]}"><span class="n">{b["n"]}</span>'
                f'<span class="p">{m.group(2)}</span><span class="s">{b["word"]}</span></div>')

    html = TILE.sub(tile, html)
    missing = sorted(set(by_n) - seen)
    if missing:
        raise SystemExit(f"!! tiles {', '.join(missing)} not found on the page; board left as it was")
    html, k = LEGEND_RE.subn(LEGEND, html, count=1)
    if not k:
        raise SystemExit("!! board legend not found on the page; board left as it was")
    return html


def main() -> int:
    ap = argparse.ArgumentParser(description="Score the Live Regime Board against each pillar's own history.")
    ap.add_argument("--db", required=True, help="Lighthouse_Master.db")
    ap.add_argument("--page", default="index.html", help="homepage to patch")
    ap.add_argument("--report", action="store_true", help="print the scores and change nothing")
    args = ap.parse_args()

    board = readings(load(Path(args.db)))
    for b in board:
        print(f"  {b['n']} {b['name']:<17} {b['idx']:<4} {b['date']}  raw {b['value']:+.2f}  "
              f"own-z {b['z']:+.2f}  {b['tone']:<5}  {b['word']}")
    if args.report:
        return 0

    page = Path(args.page)
    old = page.read_text(encoding="utf-8")
    new = patch(old, board)
    if new != old:
        page.write_text(new, encoding="utf-8")
        print(f"OK: regime board scored against own history ({page})")
    else:
        print("OK: regime board already current")
    return 0


if __name__ == "__main__":
    sys.exit(main())
