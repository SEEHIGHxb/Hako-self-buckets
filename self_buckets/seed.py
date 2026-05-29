"""Initial seed for Self-Buckets — canonical bucket contents from buckets_strategy.md."""
from __future__ import annotations

import sqlite3

SEED_BUCKETS: list[dict] = [
    {"name": "Bucket 1 — Money Maker", "kind": "anchor", "sort_order": 1},
    {"name": "Bucket 2 — Soul Stuff", "kind": "soul", "sort_order": 2},
    {"name": "Bucket 3 — Curiosity Shelf", "kind": "curiosity", "sort_order": 3},
    {"name": "Floor — Non-negotiable", "kind": "floor", "sort_order": 4},
    {"name": "Habit — Automated", "kind": "habit", "sort_order": 5},
]

# (kind, name, target_hours_per_week, target_times_per_week, notes, is_active)
SEED_ITEMS: list[tuple[str, str, float | None, int | None, str, bool]] = [
    # Anchor — gets 80% of focused energy
    ("anchor", "Master's + AI", 24.0, None,
     "The credential + AI specialization. Master's = WFH lifestyle ticket; AI = the part you actually love.", True),

    # Soul — Bucket 2, unmonetized
    ("soul", "Drawing / Painting", None, None,
     "Inherited from your art-teacher father. Peace-level. Available at home.", True),
    ("soul", "Reading", None, None,
     "Fundamental trait. Already a natural habit.", True),
    ("soul", "Singing / Karaoke", None, None,
     "No tools, no effort, at home. Don't worry about voice quality.", True),
    ("soul", "Cooking", None, None,
     "Peace + serves daily life.", True),
    ("soul", "Housekeeping", None, None,
     "Stress-reset ritual, not a chore.", True),
    ("soul", "Video Game (turn-based, unnamed)", 2.0, None,
     "Keystone creative dream. No monetization pressure. 2 hrs/week. "
     "Drops to 'ideas only' during Master's crunch weeks.", True),

    # Curiosity — Bucket 3, on the shelf, inactive by default
    ("curiosity", "Music / Instruments", None, None,
     "Not your path (your own assessment). Requires too much practice for the joy.", False),
    ("curiosity", "Trekking", None, None,
     "Needs company / time / money you don't have right now.", False),
    ("curiosity", "Board Game (standalone)", None, None,
     "Energy redirected to the video game keystone.", False),
    ("curiosity", "Trade Bot (algorithmic markets)", None, None,
     "Dream alive; AlgoTradingBot abandoned 2026-05-29 (understood <5% of trading domain). "
     "Re-entry path: learn trading fundamentals first.", False),
    ("curiosity", "Shiba Inu / pet", None, None,
     "Post-Master's, post-stability. 15-year commitment, deserves real bandwidth.", False),

    # Floor — non-negotiable health minimum
    ("floor", "Exercise", None, 3,
     "3 times per week, 30 min minimum. Structure not motivation. "
     "The reward is the absence of guilt and avoided health debt.", True),

    # Habit — automated, out of daily flow
    ("habit", "Long-term stocks (index funds)", None, None,
     "~30 min/month. Auto-invest into low-cost index funds. Not a competing interest, a discipline.", True),
]


def is_empty(conn: sqlite3.Connection) -> bool:
    row = conn.execute("SELECT COUNT(*) AS n FROM buckets").fetchone()
    return row["n"] == 0


def seed(conn: sqlite3.Connection) -> None:
    """Insert canonical bucket contents. Idempotent — runs only when buckets table is empty."""
    if not is_empty(conn):
        return

    kind_to_bucket_id: dict[str, int] = {}
    for b in SEED_BUCKETS:
        cur = conn.execute(
            "INSERT INTO buckets (name, kind, sort_order) VALUES (?, ?, ?)",
            (b["name"], b["kind"], b["sort_order"]),
        )
        kind_to_bucket_id[b["kind"]] = cur.lastrowid

    for kind, name, hrs, times, notes, active in SEED_ITEMS:
        conn.execute(
            """
            INSERT INTO items (bucket_id, name, target_hours_per_week, target_times_per_week, notes, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (kind_to_bucket_id[kind], name, hrs, times, notes, 1 if active else 0),
        )
    conn.commit()
