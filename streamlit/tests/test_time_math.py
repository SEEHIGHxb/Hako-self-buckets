from datetime import date

from self_buckets.time_math import (
    consecutive_floor_streak,
    is_drifting,
    recent_week_starts,
    week_end,
    week_range,
    week_start,
)


class TestWeekBoundaries:
    def test_monday_is_start_of_its_own_week(self):
        d = date(2026, 5, 25)  # Monday
        assert week_start(d) == d

    def test_sunday_resolves_back_to_prior_monday(self):
        d = date(2026, 5, 31)  # Sunday
        assert week_start(d) == date(2026, 5, 25)

    def test_wednesday_resolves_to_monday(self):
        d = date(2026, 5, 27)  # Wednesday
        assert week_start(d) == date(2026, 5, 25)
        assert week_end(d) == date(2026, 5, 31)

    def test_week_range_returns_mon_sun(self):
        start, end = week_range(date(2026, 5, 29))  # Friday
        assert start == date(2026, 5, 25)
        assert end == date(2026, 5, 31)


class TestRecentWeekStarts:
    def test_returns_n_mondays_oldest_first(self):
        today = date(2026, 5, 29)  # Friday → this Monday = 2026-05-25
        weeks = recent_week_starts(today, 3)
        assert weeks == [date(2026, 5, 11), date(2026, 5, 18), date(2026, 5, 25)]

    def test_empty_for_zero(self):
        assert recent_week_starts(date(2026, 5, 29), 0) == []

    def test_single_week(self):
        weeks = recent_week_starts(date(2026, 5, 29), 1)
        assert weeks == [date(2026, 5, 25)]


class TestStreak:
    def test_streak_counts_consecutive_meeting_weeks(self):
        this_mon = date(2026, 5, 25)
        counts = {
            this_mon: 3,
            this_mon.replace(day=18): 3,
            this_mon.replace(day=11): 3,
            this_mon.replace(day=4): 2,  # below target, breaks streak
        }
        assert consecutive_floor_streak(counts, target=3, most_recent_week=this_mon) == 3

    def test_streak_zero_when_current_week_misses(self):
        this_mon = date(2026, 5, 25)
        counts = {this_mon: 2, this_mon.replace(day=18): 5}
        assert consecutive_floor_streak(counts, target=3, most_recent_week=this_mon) == 0

    def test_streak_handles_missing_weeks_as_zero(self):
        this_mon = date(2026, 5, 25)
        counts = {this_mon: 5}  # no entry for prior week → counts as 0
        assert consecutive_floor_streak(counts, target=3, most_recent_week=this_mon) == 1


class TestDrift:
    def test_drift_true_when_two_weeks_below_70pct(self):
        this_mon = date(2026, 5, 25)
        last_mon = date(2026, 5, 18)
        hours = {this_mon: 10.0, last_mon: 12.0}  # both well below 70% of 24 (=16.8)
        assert is_drifting(hours, target_hours=24.0, most_recent_week=this_mon) is True

    def test_drift_false_when_one_week_meets_threshold(self):
        this_mon = date(2026, 5, 25)
        last_mon = date(2026, 5, 18)
        hours = {this_mon: 10.0, last_mon: 20.0}  # last week meets threshold
        assert is_drifting(hours, target_hours=24.0, most_recent_week=this_mon) is False

    def test_drift_false_when_target_is_zero(self):
        this_mon = date(2026, 5, 25)
        assert is_drifting({this_mon: 0.0}, target_hours=0.0, most_recent_week=this_mon) is False
