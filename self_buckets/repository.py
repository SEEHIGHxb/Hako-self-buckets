"""Data access layer — the single seam between the UI and SQLite.

A future LLM integration plugs in here (e.g. `summarize_week()` method) without
touching the Streamlit pages.
"""
from __future__ import annotations

import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Optional

from .db import connect, init_schema
from .models import Bucket, DailyLog, Item, Reflection
from .seed import seed
from .time_math import week_start


def _row_to_bucket(row: sqlite3.Row) -> Bucket:
    return Bucket(id=row["id"], name=row["name"], kind=row["kind"], sort_order=row["sort_order"])


def _row_to_item(row: sqlite3.Row) -> Item:
    return Item(
        id=row["id"],
        bucket_id=row["bucket_id"],
        name=row["name"],
        target_hours_per_week=row["target_hours_per_week"],
        target_times_per_week=row["target_times_per_week"],
        notes=row["notes"] or "",
        is_active=bool(row["is_active"]),
    )


def _row_to_log(row: sqlite3.Row) -> DailyLog:
    return DailyLog(
        id=row["id"],
        date=date.fromisoformat(row["date"]),
        item_id=row["item_id"],
        hours_spent=row["hours_spent"],
        did_it=None if row["did_it"] is None else bool(row["did_it"]),
        note=row["note"] or "",
    )


def _row_to_reflection(row: sqlite3.Row) -> Reflection:
    return Reflection(
        id=row["id"],
        week_start=date.fromisoformat(row["week_start"]),
        content=row["content"] or "",
        ai_summary=row["ai_summary"],
    )


class Repository:
    """All DB operations live here. Constructed once per app run."""

    def __init__(self, db_path: Optional[Path] = None):
        self._db_path = db_path
        with self._conn() as conn:
            init_schema(conn)
            seed(conn)

    def _conn(self) -> sqlite3.Connection:
        return connect(self._db_path)

    # ----- Buckets -----

    def list_buckets(self) -> list[Bucket]:
        with self._conn() as conn:
            rows = conn.execute("SELECT * FROM buckets ORDER BY sort_order").fetchall()
        return [_row_to_bucket(r) for r in rows]

    def get_bucket_by_kind(self, kind: str) -> Optional[Bucket]:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM buckets WHERE kind = ?", (kind,)).fetchone()
        return _row_to_bucket(row) if row else None

    # ----- Items -----

    def list_items(self, active_only: bool = False) -> list[Item]:
        sql = "SELECT * FROM items"
        params: tuple = ()
        if active_only:
            sql += " WHERE is_active = 1"
        sql += " ORDER BY bucket_id, name"
        with self._conn() as conn:
            rows = conn.execute(sql, params).fetchall()
        return [_row_to_item(r) for r in rows]

    def list_items_by_kind(self, kind: str, active_only: bool = False) -> list[Item]:
        sql = """
            SELECT items.* FROM items
            JOIN buckets ON buckets.id = items.bucket_id
            WHERE buckets.kind = ?
        """
        params: tuple = (kind,)
        if active_only:
            sql += " AND items.is_active = 1"
        sql += " ORDER BY items.name"
        with self._conn() as conn:
            rows = conn.execute(sql, params).fetchall()
        return [_row_to_item(r) for r in rows]

    def get_item(self, item_id: int) -> Optional[Item]:
        with self._conn() as conn:
            row = conn.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
        return _row_to_item(row) if row else None

    def create_item(
        self,
        bucket_id: int,
        name: str,
        target_hours_per_week: Optional[float] = None,
        target_times_per_week: Optional[int] = None,
        notes: str = "",
        is_active: bool = True,
    ) -> Item:
        with self._conn() as conn:
            cur = conn.execute(
                """
                INSERT INTO items (bucket_id, name, target_hours_per_week, target_times_per_week, notes, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (bucket_id, name, target_hours_per_week, target_times_per_week, notes, 1 if is_active else 0),
            )
            conn.commit()
            new_id = cur.lastrowid
        return self.get_item(new_id)  # type: ignore[return-value]

    def update_item(
        self,
        item_id: int,
        *,
        name: Optional[str] = None,
        target_hours_per_week: Optional[float] = None,
        target_times_per_week: Optional[int] = None,
        notes: Optional[str] = None,
        is_active: Optional[bool] = None,
        clear_hours: bool = False,
        clear_times: bool = False,
    ) -> None:
        fields: list[str] = []
        params: list = []
        if name is not None:
            fields.append("name = ?")
            params.append(name)
        if clear_hours:
            fields.append("target_hours_per_week = NULL")
        elif target_hours_per_week is not None:
            fields.append("target_hours_per_week = ?")
            params.append(target_hours_per_week)
        if clear_times:
            fields.append("target_times_per_week = NULL")
        elif target_times_per_week is not None:
            fields.append("target_times_per_week = ?")
            params.append(target_times_per_week)
        if notes is not None:
            fields.append("notes = ?")
            params.append(notes)
        if is_active is not None:
            fields.append("is_active = ?")
            params.append(1 if is_active else 0)
        if not fields:
            return
        params.append(item_id)
        with self._conn() as conn:
            conn.execute(f"UPDATE items SET {', '.join(fields)} WHERE id = ?", params)
            conn.commit()

    # ----- Daily logs -----

    def upsert_log(
        self,
        log_date: date,
        item_id: int,
        hours_spent: Optional[float] = None,
        did_it: Optional[bool] = None,
        note: str = "",
    ) -> None:
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO daily_logs (date, item_id, hours_spent, did_it, note)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(date, item_id) DO UPDATE SET
                    hours_spent = excluded.hours_spent,
                    did_it      = excluded.did_it,
                    note        = excluded.note
                """,
                (
                    log_date.isoformat(),
                    item_id,
                    hours_spent,
                    None if did_it is None else (1 if did_it else 0),
                    note,
                ),
            )
            conn.commit()

    def get_logs_for_date(self, d: date) -> list[DailyLog]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM daily_logs WHERE date = ? ORDER BY item_id",
                (d.isoformat(),),
            ).fetchall()
        return [_row_to_log(r) for r in rows]

    def get_logs_in_range(self, start: date, end: date) -> list[DailyLog]:
        """Inclusive range."""
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM daily_logs WHERE date BETWEEN ? AND ? ORDER BY date",
                (start.isoformat(), end.isoformat()),
            ).fetchall()
        return [_row_to_log(r) for r in rows]

    def get_log(self, d: date, item_id: int) -> Optional[DailyLog]:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM daily_logs WHERE date = ? AND item_id = ?",
                (d.isoformat(), item_id),
            ).fetchone()
        return _row_to_log(row) if row else None

    # ----- Aggregations -----

    def weekly_hours_by_item(self, week_monday: date) -> dict[int, float]:
        sunday = week_monday + timedelta(days=6)
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT item_id, COALESCE(SUM(hours_spent), 0.0) AS total
                FROM daily_logs
                WHERE date BETWEEN ? AND ? AND hours_spent IS NOT NULL
                GROUP BY item_id
                """,
                (week_monday.isoformat(), sunday.isoformat()),
            ).fetchall()
        return {r["item_id"]: float(r["total"]) for r in rows}

    def weekly_did_counts_by_item(self, week_monday: date) -> dict[int, int]:
        sunday = week_monday + timedelta(days=6)
        with self._conn() as conn:
            rows = conn.execute(
                """
                SELECT item_id, SUM(did_it) AS total
                FROM daily_logs
                WHERE date BETWEEN ? AND ? AND did_it IS NOT NULL
                GROUP BY item_id
                """,
                (week_monday.isoformat(), sunday.isoformat()),
            ).fetchall()
        return {r["item_id"]: int(r["total"] or 0) for r in rows}

    # ----- Reflections -----

    def get_reflection(self, monday: date) -> Optional[Reflection]:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM reflections WHERE week_start = ?",
                (monday.isoformat(),),
            ).fetchone()
        return _row_to_reflection(row) if row else None

    def save_reflection(self, monday: date, content: str) -> None:
        with self._conn() as conn:
            conn.execute(
                """
                INSERT INTO reflections (week_start, content) VALUES (?, ?)
                ON CONFLICT(week_start) DO UPDATE SET content = excluded.content
                """,
                (monday.isoformat(), content),
            )
            conn.commit()

    def list_reflections(self) -> list[Reflection]:
        with self._conn() as conn:
            rows = conn.execute(
                "SELECT * FROM reflections ORDER BY week_start DESC"
            ).fetchall()
        return [_row_to_reflection(r) for r in rows]

    # ----- Future LLM seam -----

    def summarize_week(self, monday: date) -> Optional[str]:
        """Reserved for future LLM integration. Returns None in v1."""
        return None
