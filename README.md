# Hako — Self-Buckets

> **Hako** (箱) — Japanese for *box*. Three boxes for your interests; one for what pays the bills, one for what feeds the soul, one for what waits its turn.

A personal life-strategy tracker built around the three-bucket framework. Makes the categorization *operational* — daily check-in, weekly dashboard, drift detection, Sunday reflection.

Sibling app to [Midori](https://seehighxb.github.io/Midori-ledger/) in the personal-tools family.

## Current state

This repository currently holds the **Streamlit (Python) prototype**: a local desktop app run from `launch.bat`. The data model, features, and visual design are solid and validated.

**Planned next:** rewrite as a static client-side web app (HTML/JS/IndexedDB) to deploy via GitHub Pages — matching the Midori pattern (local-first, browser-only data, no server).

## What it tracks

- **Bucket 1 — Money Maker** — Master's + AI (target: 24 h/week)
- **Bucket 2 — Soul Stuff** — drawing, reading, singing, cooking, housekeeping, video game (target: 2 h/week)
- **Bucket 3 — Curiosity Shelf** — music, trekking, board game, trade bot, Shiba Inu (inactive)
- **Floor** — exercise (target: 3 times/week, non-negotiable)
- **Habit** — long-term index fund stocks (automated)

## Run locally (Streamlit prototype)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
streamlit run app.py
```

Or double-click `launch.bat`.

The app opens at <http://localhost:8501>. Data lives at `data/self_buckets.db` (SQLite, gitignored).

## Pages

1. **Home** — this week at a glance, soul stuff for today, last reflection.
2. **Buckets** — view and edit categorization inline.
3. **Daily Check** — log today's hours and binary completions.
4. **Dashboard** — gauges, soul-stuff tally, 8-week trend, drift indicator.
5. **Reflection** — weekly prompts. Defaults to current week, can backfill any prior week.

## Tests

```powershell
pytest tests/
```

29 tests covering CRUD, seed idempotency, weekly aggregations, week boundaries, streak math, drift detection.

## Architecture seams

- `self_buckets/repository.py::summarize_week()` — reserved for future LLM integration (returns `None` in v1).
- `self_buckets/time_math.py` — pure date helpers, no DB dependency, fully testable in isolation.
- Schema lives in `self_buckets/db.py` as plain `CREATE TABLE IF NOT EXISTS` — no migration framework needed at this scale.

## Roadmap

- [x] Streamlit prototype with full feature set (Home/Buckets/Daily/Dashboard/Reflection)
- [x] Test coverage for data layer and time math
- [ ] Rewrite as static webapp (HTML/JS/IndexedDB) for GitHub Pages deployment
- [ ] Match Midori's minimalist visual style
- [ ] Optional encrypted cloud sync (Midori-style ZenSync) — future
