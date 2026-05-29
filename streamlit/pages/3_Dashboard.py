"""Dashboard page — weekly view and trends."""
from __future__ import annotations

from datetime import date, timedelta

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from app_utils import format_hours, get_repo
from self_buckets.time_math import (
    consecutive_floor_streak,
    is_drifting,
    recent_week_starts,
    week_start,
)

st.set_page_config(page_title="Hako — Dashboard", layout="wide")
st.title("Dashboard")

repo = get_repo()
today = date.today()
this_monday = week_start(today)

LOOKBACK_WEEKS = 8


# ---------- Gather data ----------
active_anchor = repo.list_items_by_kind("anchor", active_only=True)
active_soul = repo.list_items_by_kind("soul", active_only=True)
active_floor = repo.list_items_by_kind("floor", active_only=True)

video_game = next((i for i in active_soul if i.is_time_tracked), None)
exercise = next((i for i in active_floor if i.target_times_per_week), None)
binary_soul = [i for i in active_soul if i.is_binary]

# This week
week_hours = repo.weekly_hours_by_item(this_monday)
week_counts = repo.weekly_did_counts_by_item(this_monday)


def gauge(actual: float, target: float, title: str) -> go.Figure:
    pct = min(100, (actual / target * 100) if target > 0 else 0)
    color = "#2ca02c" if pct >= 80 else "#ff7f0e" if pct >= 50 else "#d62728"
    fig = go.Figure(
        go.Indicator(
            mode="gauge+number",
            value=actual,
            number={"suffix": " h", "valueformat": ".1f"},
            title={"text": f"{title}<br><span style='font-size:0.8em'>target {target:g} h</span>"},
            gauge={
                "axis": {"range": [0, max(target * 1.25, target + 1)]},
                "bar": {"color": color},
                "threshold": {
                    "line": {"color": "white", "width": 3},
                    "thickness": 0.75,
                    "value": target,
                },
            },
        )
    )
    fig.update_layout(height=260, margin=dict(l=20, r=20, t=60, b=20))
    return fig


# ---------- This week section ----------
st.subheader(f"This week — week of {this_monday.strftime('%d %b %Y')}")

cols = st.columns(3)
if active_anchor:
    anchor = active_anchor[0]
    actual = week_hours.get(anchor.id, 0.0)
    target = anchor.target_hours_per_week or 0.0
    with cols[0]:
        st.plotly_chart(gauge(actual, target, anchor.name), width="stretch")

if video_game:
    actual = week_hours.get(video_game.id, 0.0)
    target = video_game.target_hours_per_week or 0.0
    with cols[1]:
        st.plotly_chart(gauge(actual, target, "Video Game"), width="stretch")

if exercise:
    count = week_counts.get(exercise.id, 0)
    target_count = exercise.target_times_per_week or 0
    with cols[2]:
        st.metric(f"Floor — {exercise.name}", f"{count} / {target_count}")
        dots = "● " * count + "○ " * max(0, target_count - count)
        st.markdown(f"### {dots.strip()}")
        # Streak
        all_weeks = recent_week_starts(today, 12)
        weekly_counts_for_streak: dict[date, int] = {}
        for wmon in all_weeks:
            counts = repo.weekly_did_counts_by_item(wmon)
            weekly_counts_for_streak[wmon] = counts.get(exercise.id, 0)
        streak = consecutive_floor_streak(weekly_counts_for_streak, target_count, this_monday)
        st.caption(f"Streak: **{streak} week(s)** at target")

st.divider()

# ---------- Soul stuff tally ----------
st.subheader("Soul stuff — this week tally")
if binary_soul:
    tally_rows = []
    for item in binary_soul:
        c = week_counts.get(item.id, 0)
        tally_rows.append({"Activity": item.name, "Days this week": c})
    tally_df = pd.DataFrame(tally_rows)
    fig = px.bar(
        tally_df,
        x="Activity",
        y="Days this week",
        text="Days this week",
        range_y=[0, 7],
    )
    fig.update_traces(textposition="outside")
    fig.update_layout(height=320, margin=dict(l=20, r=20, t=20, b=40))
    st.plotly_chart(fig, width="stretch")
else:
    st.caption("No binary soul items configured.")

st.divider()

# ---------- Trend (last N weeks) ----------
st.subheader(f"Trend — last {LOOKBACK_WEEKS} weeks")

weeks = recent_week_starts(today, LOOKBACK_WEEKS)
trend_rows: list[dict] = []
exercise_rows: list[dict] = []
for wmon in weeks:
    wh = repo.weekly_hours_by_item(wmon)
    wc = repo.weekly_did_counts_by_item(wmon)
    label = wmon.strftime("%d %b")
    for item in active_anchor + active_soul:
        if item.is_time_tracked:
            trend_rows.append(
                {"Week": label, "Item": item.name, "Hours": wh.get(item.id, 0.0)}
            )
    if exercise:
        exercise_rows.append({"Week": label, "Exercise days": wc.get(exercise.id, 0)})

trend_df = pd.DataFrame(trend_rows)
if not trend_df.empty:
    fig_trend = px.bar(
        trend_df,
        x="Week",
        y="Hours",
        color="Item",
        barmode="stack",
        text_auto=".1f",
    )
    fig_trend.update_layout(height=380, margin=dict(l=20, r=20, t=20, b=40))
    st.plotly_chart(fig_trend, width="stretch")
else:
    st.caption("No hour logs yet — log some days to see the trend.")

if exercise_rows:
    ex_df = pd.DataFrame(exercise_rows)
    target_count = exercise.target_times_per_week if exercise else 3
    fig_ex = px.line(ex_df, x="Week", y="Exercise days", markers=True)
    fig_ex.add_hline(
        y=target_count,
        line_dash="dash",
        line_color="green",
        annotation_text=f"target {target_count}/wk",
        annotation_position="top right",
    )
    fig_ex.update_yaxes(range=[0, 7])
    fig_ex.update_layout(height=300, margin=dict(l=20, r=20, t=20, b=40))
    st.plotly_chart(fig_ex, width="stretch")

# ---------- Drift indicator ----------
st.divider()
st.subheader("Drift check")
if active_anchor:
    anchor = active_anchor[0]
    target = anchor.target_hours_per_week or 0.0
    weekly_hours_for_drift: dict[date, float] = {}
    for wmon in weeks:
        wh = repo.weekly_hours_by_item(wmon)
        weekly_hours_for_drift[wmon] = wh.get(anchor.id, 0.0)
    drifting = is_drifting(
        weekly_hours_for_drift,
        target_hours=target,
        most_recent_week=this_monday,
        threshold_pct=0.70,
        weeks_required=2,
    )
    if drifting:
        st.error(
            f"**Drift flagged.** {anchor.name} is below 70% of the {format_hours(target)} weekly "
            "target for two weeks running. Consider what's pulling at you and whether a Bucket 3 "
            "item has been quietly creeping into focus."
        )
    else:
        last_actual = weekly_hours_for_drift.get(this_monday, 0.0)
        st.success(
            f"No drift on {anchor.name}. This week so far: {format_hours(last_actual)} / "
            f"{format_hours(target)} target."
        )
