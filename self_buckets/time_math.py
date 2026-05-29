"""Pure date/time helpers — no DB dependencies, easy to test."""
from __future__ import annotations

from datetime import date, timedelta


def week_start(d: date) -> date:
    """Return the Monday of the ISO week containing d."""
    return d - timedelta(days=d.weekday())


def week_end(d: date) -> date:
    """Return the Sunday of the ISO week containing d."""
    return week_start(d) + timedelta(days=6)


def week_range(d: date) -> tuple[date, date]:
    """Return (Monday, Sunday) for the ISO week containing d."""
    start = week_start(d)
    return start, start + timedelta(days=6)


def recent_week_starts(today: date, n: int) -> list[date]:
    """Return the last n Mondays (including this week's Monday), oldest first."""
    if n < 1:
        return []
    this_monday = week_start(today)
    return [this_monday - timedelta(weeks=n - 1 - i) for i in range(n)]


def consecutive_floor_streak(
    weekly_counts: dict[date, int],
    target: int,
    most_recent_week: date,
) -> int:
    """
    Count consecutive most-recent weeks that met the floor (count >= target).

    Walks backward from most_recent_week until a week fails the target.
    """
    streak = 0
    cursor = most_recent_week
    while True:
        count = weekly_counts.get(cursor, 0)
        if count >= target:
            streak += 1
            cursor = cursor - timedelta(weeks=1)
        else:
            break
    return streak


def is_drifting(
    weekly_hours: dict[date, float],
    target_hours: float,
    most_recent_week: date,
    threshold_pct: float = 0.70,
    weeks_required: int = 2,
) -> bool:
    """
    Return True if the most recent `weeks_required` weeks all fell below
    `threshold_pct` of the weekly target.
    """
    if target_hours <= 0 or weeks_required < 1:
        return False
    threshold = target_hours * threshold_pct
    cursor = most_recent_week
    for _ in range(weeks_required):
        actual = weekly_hours.get(cursor, 0.0)
        if actual >= threshold:
            return False
        cursor = cursor - timedelta(weeks=1)
    return True
