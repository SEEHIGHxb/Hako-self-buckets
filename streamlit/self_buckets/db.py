"""SQLite connection and schema for Self-Buckets."""
from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = PROJECT_ROOT / "data" / "self_buckets.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS buckets (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    kind        TEXT NOT NULL CHECK (kind IN ('anchor', 'soul', 'curiosity', 'floor', 'habit')),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    UNIQUE (kind)
);

CREATE TABLE IF NOT EXISTS items (
    id                      INTEGER PRIMARY KEY AUTOINCREMENT,
    bucket_id               INTEGER NOT NULL REFERENCES buckets(id) ON DELETE CASCADE,
    name                    TEXT NOT NULL,
    target_hours_per_week   REAL,
    target_times_per_week   INTEGER,
    notes                   TEXT NOT NULL DEFAULT '',
    is_active               INTEGER NOT NULL DEFAULT 1,
    UNIQUE (bucket_id, name)
);

CREATE INDEX IF NOT EXISTS idx_items_bucket ON items(bucket_id);

CREATE TABLE IF NOT EXISTS daily_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    date        TEXT NOT NULL,
    item_id     INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    hours_spent REAL,
    did_it      INTEGER,
    note        TEXT NOT NULL DEFAULT '',
    UNIQUE (date, item_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON daily_logs(date);
CREATE INDEX IF NOT EXISTS idx_daily_logs_item ON daily_logs(item_id);

CREATE TABLE IF NOT EXISTS reflections (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start  TEXT NOT NULL UNIQUE,
    content     TEXT NOT NULL DEFAULT '',
    ai_summary  TEXT
);
"""


def connect(db_path: Optional[Path] = None) -> sqlite3.Connection:
    """Open a SQLite connection with sensible defaults."""
    path = Path(db_path) if db_path else DEFAULT_DB_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_schema(conn: sqlite3.Connection) -> None:
    """Create all tables idempotently."""
    conn.executescript(SCHEMA)
    conn.commit()
