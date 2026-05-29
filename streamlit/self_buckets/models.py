"""Domain dataclasses for Self-Buckets."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Optional

BucketKind = str  # 'anchor' | 'soul' | 'curiosity' | 'floor' | 'habit'

KIND_LABELS: dict[str, str] = {
    "anchor": "Bucket 1 — Money Maker",
    "soul": "Bucket 2 — Soul Stuff",
    "curiosity": "Bucket 3 — Curiosity Shelf",
    "floor": "Floor — Non-negotiable",
    "habit": "Habit — Automated",
}

KIND_ORDER: list[str] = ["anchor", "soul", "curiosity", "floor", "habit"]


@dataclass
class Bucket:
    id: int
    name: str
    kind: BucketKind
    sort_order: int


@dataclass
class Item:
    id: int
    bucket_id: int
    name: str
    target_hours_per_week: Optional[float] = None
    target_times_per_week: Optional[int] = None
    notes: str = ""
    is_active: bool = True

    @property
    def is_time_tracked(self) -> bool:
        return self.target_hours_per_week is not None

    @property
    def is_binary(self) -> bool:
        return self.target_hours_per_week is None


@dataclass
class DailyLog:
    id: int
    date: date
    item_id: int
    hours_spent: Optional[float] = None
    did_it: Optional[bool] = None
    note: str = ""


@dataclass
class Reflection:
    id: int
    week_start: date  # Monday of the reflected week
    content: str
    ai_summary: Optional[str] = None
