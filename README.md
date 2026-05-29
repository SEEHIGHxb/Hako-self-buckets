# Hako — Self-Buckets

> **Hako** (箱) — Japanese for *box*. Three boxes for your interests: one for what pays the bills, one for what feeds the soul, one for what waits its turn.

A personal life-strategy tracker built around the three-bucket framework from [Knowspire's "Career Strategy For People With Too Many Interests"](https://www.youtube.com/watch?v=Jq-3EtFDjbs). Daily check-in, weekly dashboard, drift detection, Sunday reflection — all in a single browser tab, your data never leaves your device.

Sibling app to [Midori](https://seehighxb.github.io/Midori-ledger/) in the personal-tools family.

**Live:** <https://seehighxb.github.io/Hako-self-buckets/>

## What it tracks

The framework defines five containers:

| Kind | What goes in | How it's tracked |
|------|--------------|------------------|
| **Bucket 1 — Money Maker** | Your one bill-paying skill (gets ~80% of focus) | Hours per week vs target |
| **Bucket 2 — Soul Stuff** | Hobbies that make you feel alive — unmonetized | Daily checkboxes + optional hour-capped creative project |
| **Bucket 3 — Curiosity Shelf** | Interests waiting their turn (inactive by default) | Listed but not in daily flow |
| **Floor — Non-negotiable** | Health minimums (e.g. exercise) | Times per week, streak counter |
| **Habit — Automated** | Disciplines on autopilot (e.g. monthly index-fund deposit) | Listed for reference |

Hako ships with **generic seed items** — you replace them with your own on the Buckets page. Your personal data lives in your browser's LocalStorage and never reaches this repo.

## Architecture

- **Static SPA** — HTML + vanilla JS + Chart.js (CDN), no build step, no server
- **LocalStorage persistence** — your data is your data
- **PWA** — installable on mobile (Add to Home Screen), works offline via service worker
- **GitHub Pages hosted** — free, owned by your GitHub account

## Project structure

```
Hako-self-buckets/
├── index.html            # SPA shell (sidebar + 6 tabs)
├── css/style.css         # Midori-family design tokens, dark theme default
├── js/
│   ├── state.js          # LocalStorage + initial seed
│   ├── time-math.js      # Week boundaries, streaks, drift detection (pure)
│   ├── repository.js     # CRUD on state — single seam for future LLM
│   ├── charts.js         # Chart.js wrappers (gauges, tally bars, trend, exercise line)
│   └── app.js            # Tab controller + page renderers + modal handlers
├── image/hako.svg        # Logo + PWA icon
├── manifest.json         # PWA manifest
├── sw.js                 # Service worker (offline cache)
└── streamlit/            # Original Python prototype (kept as portfolio reference)
```

## Run locally (no server needed for most browsers)

You can open `index.html` directly in a browser. Service worker registration won't work over `file://`, but everything else does.

For full PWA testing (service worker, install prompt), serve over HTTP:

```powershell
# Python (built-in)
python -m http.server 8000

# Then open http://localhost:8000/
```

## Pages

1. **Home** — this week at a glance (anchor hours, video game hours, exercise dots) + soul-stuff checkboxes for today + last reflection preview
2. **Buckets** — view and edit categorization. Add/edit/deactivate items per bucket.
3. **Daily Check** — date picker, hour inputs for time-tracked items, binary tiles for soul/floor items, day note, recent 7-day mini-table
4. **Dashboard** — current-week metrics, soul tally bar, 8-week stacked trend, exercise line, drift indicator
5. **Reflection** — 4-prompt weekly write-up (defaults to current week, backfills any prior week), past reflections collapsible
6. **Settings** — export/import JSON backup, reset all data, version info

## Data portability

- **Export:** Settings → Export Backup JSON — downloads `hako-backup-YYYY-MM-DD.json`
- **Import:** Settings → Import Backup JSON — restores full state from file
- **Reset:** Settings → Reset all data — wipes LocalStorage and reseeds

The exported JSON is plain and human-readable; you can hand-edit it or use it to migrate between devices.

## Roadmap

- [x] Static SPA with bucket framework + daily check-in + dashboard + reflection
- [x] PWA (offline-capable, installable on mobile)
- [x] LocalStorage persistence with JSON export/import
- [ ] Optional encrypted cloud sync (Midori-style ZenSync) — future
- [ ] LLM-powered weekly reflection summaries (seam already reserved at `summarizeWeek()`) — future
- [ ] Mobile-optimized layout polish — ongoing

## The Streamlit prototype

The `streamlit/` directory contains the original Python/Streamlit prototype that was used to validate the data model and bucket math before this static rewrite. It's kept as a portfolio reference and an alternate local-only interface. See `streamlit/README.md` for details.

## Credits

- Framework: [Knowspire](https://www.youtube.com/@Knowspire) — *Career Strategy For People With Too Many Interests*
- Design language: borrowed from [Midori](https://seehighxb.github.io/Midori-ledger/), my own ledger PWA
- Fonts: Inter, Outfit, Noto Serif JP (Google Fonts)
- Charts: [Chart.js](https://www.chartjs.org/)
