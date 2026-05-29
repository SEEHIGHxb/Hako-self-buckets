"""Self-Buckets — Home page.

Run with: `streamlit run app.py`
"""
from __future__ import annotations

from datetime import date

import streamlit as st

from app_utils import format_hours, get_repo, humanize_date, progress_pct
from self_buckets.time_math import week_start

st.set_page_config(
    page_title="Hako — Self-Buckets",
    layout="wide",
    initial_sidebar_state="expanded",
)

repo = get_repo()
today = date.today()
this_monday = week_start(today)

# ---------- Header ----------
st.title("Hako")
st.caption(f"Self-Buckets · {humanize_date(today)}")

st.markdown(
    "_Strategy isn't a poster on the wall — it's what shows up in your week. "
    "This is where your buckets meet your calendar._"
)

st.divider()

# ---------- This week summary ----------
st.subheader("This week at a glance")

anchor_items = repo.list_items_by_kind("anchor", active_only=True)
soul_items = repo.list_items_by_kind("soul", active_only=True)
floor_items = repo.list_items_by_kind("floor", active_only=True)

hours_this_week = repo.weekly_hours_by_item(this_monday)
counts_this_week = repo.weekly_did_counts_by_item(this_monday)

cols = st.columns(3)

# Bucket 1 anchor (Master's + AI)
with cols[0]:
    if anchor_items:
        anchor = anchor_items[0]
        actual = hours_this_week.get(anchor.id, 0.0)
        target = anchor.target_hours_per_week or 0.0
        st.metric(
            label=f"Bucket 1 — {anchor.name}",
            value=format_hours(actual),
            delta=f"target {format_hours(target)}",
            delta_color="off",
        )
        st.progress(progress_pct(actual, target))
    else:
        st.info("No anchor item set.")

# Bucket 2 — video game (the time-tracked soul item)
with cols[1]:
    video_game = next((i for i in soul_items if i.is_time_tracked), None)
    if video_game:
        actual = hours_this_week.get(video_game.id, 0.0)
        target = video_game.target_hours_per_week or 0.0
        st.metric(
            label=f"Bucket 2 — {video_game.name}",
            value=format_hours(actual),
            delta=f"target {format_hours(target)}",
            delta_color="off",
        )
        st.progress(progress_pct(actual, target))
    else:
        st.info("No time-tracked soul item.")

# Exercise floor
with cols[2]:
    exercise = next((i for i in floor_items if i.target_times_per_week), None)
    if exercise:
        count = counts_this_week.get(exercise.id, 0)
        target = exercise.target_times_per_week or 0
        st.metric(
            label=f"Floor — {exercise.name}",
            value=f"{count} / {target}",
            delta="non-negotiable",
            delta_color="off",
        )
        dots = "● " * count + "○ " * max(0, target - count)
        st.markdown(f"#### {dots.strip()}")
    else:
        st.info("No floor item set.")

st.divider()

# ---------- Soul checkboxes (binary, today) ----------
st.subheader("Soul stuff today")
todays_logs = {log.item_id: log for log in repo.get_logs_for_date(today)}
binary_soul = [i for i in soul_items if i.is_binary]
if binary_soul:
    cols2 = st.columns(len(binary_soul))
    for col, item in zip(cols2, binary_soul):
        with col:
            log = todays_logs.get(item.id)
            done = bool(log and log.did_it)
            marker = "[x]" if done else "[ ]"
            st.markdown(f"### `{marker}`\n**{item.name}**")
else:
    st.caption("No binary soul items configured.")

st.caption("Use the Daily Check-in page to log these.")

st.divider()

# ---------- Last reflection ----------
st.subheader("Last reflection")
reflections = repo.list_reflections()
if reflections:
    latest = reflections[0]
    age = (today - latest.week_start).days
    st.write(f"**Week of {humanize_date(latest.week_start)}** — {age} days ago")
    preview = latest.content.strip().split("\n", 1)[0][:200]
    st.caption(preview or "_(empty)_")
else:
    st.info("No reflections yet. Open the Reflection page on Sunday to write your first.")

st.divider()

# ---------- Footer nav ----------
st.caption(
    "Pages: **Buckets** to view/edit items · **Daily Check** to log today · "
    "**Dashboard** for weekly trends · **Reflection** for the Sunday write-up."
)
