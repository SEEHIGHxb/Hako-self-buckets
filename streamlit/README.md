# Hako — Streamlit Prototype

This is the **original Python/Streamlit prototype** of Hako. It runs locally as a desktop dashboard and was used to validate the data model, feature shape, and bucket math before the static webapp rewrite.

The canonical Hako lives at the repo root (HTML/JS/IndexedDB) and is deployed at <https://seehighxb.github.io/Hako-self-buckets/>. This `streamlit/` folder is kept as a portfolio reference and an alternate local-only interface for power users.

## Stack

- Python 3.12
- Streamlit (UI), SQLite (stdlib), Plotly (charts), pandas, pytest
- Repository pattern; no ORM
- 29 passing tests in `tests/`

## Run locally

```powershell
cd streamlit
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
streamlit run app.py
```

Or double-click `launch.bat`.

The app opens at <http://localhost:8501>. Your data lives at `streamlit/data/self_buckets.db` (gitignored).

## Pages

1. **Home** — this week at a glance.
2. **Buckets** — view and edit categorization inline.
3. **Daily Check** — log today's hours and binary completions.
4. **Dashboard** — gauges, soul-stuff tally, 8-week trend, drift indicator.
5. **Reflection** — weekly prompts.

## Tests

```powershell
pytest tests/
```

29 tests covering CRUD, seed idempotency, weekly aggregations, week boundaries, streak math, drift detection.

## Note

The seed in `self_buckets/seed.py` ships with **generic placeholders** (Main career skill / Soul activity A / etc.) — replace them with your own items via the Buckets page in the app. Your personal data stays in your local `data/*.db` SQLite file and never reaches this repository.
