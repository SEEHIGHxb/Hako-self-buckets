"""Daily Check-in page — log today's hours and binary completions."""
from __future__ import annotations

from datetime import date, timedelta

import pandas as pd
import streamlit as st

from app_utils import get_repo, humanize_date

st.set_page_config(page_title="Hako — Daily Check", layout="wide")
st.title("Daily Check-in")

repo = get_repo()

# ---------- Date selector ----------
log_date: date = st.date_input("Date", value=date.today())
st.caption(humanize_date(log_date))

# Gather active items that participate in the daily flow
DAILY_KINDS = ("anchor", "soul", "floor")
active_items: list = []
for kind in DAILY_KINDS:
    active_items.extend(repo.list_items_by_kind(kind, active_only=True))

# Existing logs for the selected day
existing = {log.item_id: log for log in repo.get_logs_for_date(log_date)}

time_tracked = [i for i in active_items if i.is_time_tracked]
binary = [i for i in active_items if i.is_binary]

st.divider()

# ---------- Time-tracked items ----------
with st.form("daily_check_form"):
    st.subheader("Hours")
    hour_values: dict[int, float] = {}
    for item in time_tracked:
        prev = existing.get(item.id)
        default = float(prev.hours_spent) if prev and prev.hours_spent is not None else 0.0
        target_hint = (
            f"target {item.target_hours_per_week:g} h/week"
            if item.target_hours_per_week else ""
        )
        hour_values[item.id] = st.number_input(
            f"{item.name}  ·  {target_hint}",
            min_value=0.0,
            max_value=24.0,
            value=default,
            step=0.5,
            key=f"hrs_{item.id}",
        )

    st.subheader("Did you do it?")
    bin_values: dict[int, bool] = {}
    cols = st.columns(min(len(binary), 4)) if binary else []
    for idx, item in enumerate(binary):
        with cols[idx % len(cols)]:
            prev = existing.get(item.id)
            default = bool(prev.did_it) if prev and prev.did_it is not None else False
            bin_values[item.id] = st.checkbox(item.name, value=default, key=f"bin_{item.id}")

    st.subheader("Notes")
    # Use the first existing note we find (logs share the per-day note in practice).
    default_note = next((log.note for log in existing.values() if log.note), "")
    note = st.text_area("How was the day?", value=default_note, height=100, key="note")

    submitted = st.form_submit_button("Save day", type="primary")

if submitted:
    for item_id, hrs in hour_values.items():
        repo.upsert_log(log_date, item_id, hours_spent=hrs, note=note)
    for item_id, did in bin_values.items():
        repo.upsert_log(log_date, item_id, did_it=did, note=note)
    st.success(f"Saved {humanize_date(log_date)}.")
    st.cache_resource.clear()  # bust the repo cache so Home reflects latest immediately
    st.rerun()

st.divider()

# ---------- Recent 7 days mini-table ----------
st.subheader("Recent 7 days")
end = log_date
start = end - timedelta(days=6)
recent_logs = repo.get_logs_in_range(start, end)

if not recent_logs:
    st.caption("No logs in this range yet.")
else:
    # Build a small wide table: rows = items, cols = dates
    item_lookup = {i.id: i for i in active_items}
    dates = [start + timedelta(days=i) for i in range(7)]
    rows: list[dict] = []
    for item in active_items:
        row: dict = {"Item": item.name}
        for d in dates:
            log = next(
                (l for l in recent_logs if l.item_id == item.id and l.date == d),
                None,
            )
            if log is None:
                row[d.strftime("%a %d")] = ""
            elif log.hours_spent is not None:
                row[d.strftime("%a %d")] = f"{log.hours_spent:g}h"
            elif log.did_it is not None:
                row[d.strftime("%a %d")] = "x" if log.did_it else "·"
            else:
                row[d.strftime("%a %d")] = ""
        rows.append(row)
    df = pd.DataFrame(rows)
    st.dataframe(df, width="stretch", hide_index=True)
