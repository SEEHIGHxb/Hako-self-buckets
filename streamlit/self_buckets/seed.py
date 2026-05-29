"""Initial seed for Self-Buckets — generic bucket framework structure.

This is a template seed for the bucket framework (Bucket 1/2/3 + Floor + Habit).
The framework comes from the public "Career Strategy For People With Too Many
Interests" video by Knowspire. Personalize by editing items in the UI after
first run — your data lives in `data/self_buckets.db`, which is gitignored.
"""
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
# Replace these placeholders with your own items via the Buckets page in the app.
SEED_ITEMS: list[tuple[str, str, float | None, int | None, str, bool]] = [
    # Anchor — gets 80% of focused energy
    ("anchor", "Main career skill", 24.0, None,
     "Your bill-paying skill. Already somewhat good at, real demand, you don't hate it.", True),

    # Soul — Bucket 2, unmonetized
    ("soul", "Soul activity A", None, None,
     "A hobby you do because it makes you feel alive. Don't try to monetize.", True),
    ("soul", "Soul activity B", None, None,
     "Another unmonetized hobby. Available without tools.", True),
    ("soul", "Creative side project", 2.0, None,
     "A creative dream — no monetization expectation. Capped time slot, falls back during crunch weeks.", True),

    # Curiosity — Bucket 3, on the shelf, inactive by default
    ("curiosity", "Curiosity item A", None, None,
     "Something you're curious about but not investing in right now. Not now, not never.", False),
    ("curiosity", "Curiosity item B", None, None,
     "Another shelved interest with a clear re-entry path when life conditions change.", False),

    # Floor — non-negotiable health minimum
    ("floor", "Exercise", None, 3,
     "3 times per week minimum. Structure not motivation. The reward is the absence of guilt and avoided health debt.", True),

    # Habit — automated, out of daily flow
    ("habit", "Long-term investing", None, None,
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
