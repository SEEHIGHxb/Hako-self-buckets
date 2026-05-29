from datetime import date

import pytest

from self_buckets.models import KIND_ORDER
from self_buckets.repository import Repository


@pytest.fixture()
def repo(tmp_path):
    return Repository(db_path=tmp_path / "test.db")


class TestSeed:
    def test_seed_creates_five_buckets(self, repo):
        buckets = repo.list_buckets()
        assert len(buckets) == 5
        assert {b.kind for b in buckets} == set(KIND_ORDER)

    def test_seed_creates_anchor_item(self, repo):
        items = repo.list_items_by_kind("anchor")
        assert len(items) == 1
        assert items[0].name == "Master's + AI"
        assert items[0].target_hours_per_week == 24.0

    def test_seed_video_game_has_2hr_target(self, repo):
        soul = repo.list_items_by_kind("soul")
        video_game = next(i for i in soul if "Video Game" in i.name)
        assert video_game.target_hours_per_week == 2.0

    def test_seed_exercise_has_3_times_target(self, repo):
        floor = repo.list_items_by_kind("floor")
        exercise = next(i for i in floor if i.name == "Exercise")
        assert exercise.target_times_per_week == 3

    def test_seed_curiosity_items_inactive(self, repo):
        curiosity = repo.list_items_by_kind("curiosity")
        assert all(not i.is_active for i in curiosity)

    def test_seed_idempotent(self, repo, tmp_path):
        # Constructing a second Repository on the same path shouldn't duplicate seeds
        Repository(db_path=tmp_path / "test.db")
        assert len(repo.list_buckets()) == 5
        anchor_items = repo.list_items_by_kind("anchor")
        assert len(anchor_items) == 1


class TestItemCRUD:
    def test_update_item_notes(self, repo):
        anchor = repo.list_items_by_kind("anchor")[0]
        repo.update_item(anchor.id, notes="Updated")
        fresh = repo.get_item(anchor.id)
        assert fresh.notes == "Updated"

    def test_deactivate_item(self, repo):
        anchor = repo.list_items_by_kind("anchor")[0]
        repo.update_item(anchor.id, is_active=False)
        active = repo.list_items_by_kind("anchor", active_only=True)
        assert anchor.id not in {i.id for i in active}

    def test_create_new_item(self, repo):
        soul_bucket = repo.get_bucket_by_kind("soul")
        new = repo.create_item(soul_bucket.id, name="Photography", notes="future hobby")
        assert new.bucket_id == soul_bucket.id
        soul_items = repo.list_items_by_kind("soul")
        assert "Photography" in {i.name for i in soul_items}


class TestDailyLogs:
    def test_upsert_creates_then_updates(self, repo):
        anchor = repo.list_items_by_kind("anchor")[0]
        d = date(2026, 5, 27)
        repo.upsert_log(d, anchor.id, hours_spent=3.5)
        log = repo.get_log(d, anchor.id)
        assert log.hours_spent == 3.5

        repo.upsert_log(d, anchor.id, hours_spent=4.0, note="long session")
        updated = repo.get_log(d, anchor.id)
        assert updated.hours_spent == 4.0
        assert updated.note == "long session"

    def test_binary_log_did_it(self, repo):
        exercise = next(i for i in repo.list_items_by_kind("floor") if i.name == "Exercise")
        d = date(2026, 5, 27)
        repo.upsert_log(d, exercise.id, did_it=True)
        log = repo.get_log(d, exercise.id)
        assert log.did_it is True

    def test_logs_in_range_inclusive(self, repo):
        anchor = repo.list_items_by_kind("anchor")[0]
        for day in (25, 27, 31):
            repo.upsert_log(date(2026, 5, day), anchor.id, hours_spent=2.0)
        logs = repo.get_logs_in_range(date(2026, 5, 25), date(2026, 5, 31))
        assert len(logs) == 3


class TestAggregations:
    def test_weekly_hours_sums_within_range(self, repo):
        anchor = repo.list_items_by_kind("anchor")[0]
        # Week of 2026-05-25 (Mon) — log on three days
        repo.upsert_log(date(2026, 5, 25), anchor.id, hours_spent=4.0)
        repo.upsert_log(date(2026, 5, 27), anchor.id, hours_spent=3.5)
        repo.upsert_log(date(2026, 5, 30), anchor.id, hours_spent=5.0)
        # Log outside the week should be ignored
        repo.upsert_log(date(2026, 5, 24), anchor.id, hours_spent=99.0)

        totals = repo.weekly_hours_by_item(date(2026, 5, 25))
        assert totals[anchor.id] == pytest.approx(12.5)

    def test_weekly_did_counts(self, repo):
        exercise = next(i for i in repo.list_items_by_kind("floor") if i.name == "Exercise")
        for day in (25, 27, 29):
            repo.upsert_log(date(2026, 5, day), exercise.id, did_it=True)
        repo.upsert_log(date(2026, 5, 30), exercise.id, did_it=False)

        counts = repo.weekly_did_counts_by_item(date(2026, 5, 25))
        assert counts[exercise.id] == 3


class TestReflections:
    def test_save_and_get_reflection(self, repo):
        monday = date(2026, 5, 25)
        repo.save_reflection(monday, "Tested the framework this week.")
        reflection = repo.get_reflection(monday)
        assert reflection.content == "Tested the framework this week."

    def test_save_reflection_idempotent(self, repo):
        monday = date(2026, 5, 25)
        repo.save_reflection(monday, "first draft")
        repo.save_reflection(monday, "second draft")
        reflection = repo.get_reflection(monday)
        assert reflection.content == "second draft"
        assert len(repo.list_reflections()) == 1
