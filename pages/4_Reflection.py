"""Reflection page — weekly (Sunday) write-up."""
from __future__ import annotations

import re
from datetime import date, timedelta

import streamlit as st

from app_utils import get_repo, humanize_date
from self_buckets.time_math import week_start

st.set_page_config(page_title="Hako — Reflection", layout="wide")
st.title("Weekly Reflection")

repo = get_repo()
today = date.today()

PROMPTS: list[str] = [
    "What worked this week?",
    "Where did I drift from my buckets?",
    "What pulled at me from Bucket 3?",
    "What does next week need from me?",
]


def build_content(answers: list[str]) -> str:
    parts: list[str] = []
    for prompt, answer in zip(PROMPTS, answers):
        parts.append(f"### {prompt}\n\n{answer.strip()}\n")
    return "\n".join(parts).strip() + "\n"


def parse_content(content: str) -> list[str]:
    """Split saved markdown back into the per-prompt answers (best-effort)."""
    if not content.strip():
        return ["" for _ in PROMPTS]
    sections: dict[str, str] = {}
    blocks = re.split(r"^###\s+", content, flags=re.MULTILINE)
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        header, _, body = block.partition("\n")
        sections[header.strip()] = body.strip()
    return [sections.get(p, "") for p in PROMPTS]


# ---------- Week selector ----------
this_monday = week_start(today)
default_week = this_monday  # write the current week's reflection
selected_week = st.date_input(
    "Reflection for week starting (Monday)",
    value=default_week,
    help="Defaults to this week's Monday. You can backfill prior weeks here.",
)
selected_monday = week_start(selected_week)
sunday = selected_monday + timedelta(days=6)
st.caption(f"Week: {humanize_date(selected_monday)} — {humanize_date(sunday)}")

existing = repo.get_reflection(selected_monday)
initial_answers = parse_content(existing.content) if existing else ["" for _ in PROMPTS]

st.divider()

# ---------- Prompts ----------
with st.form("reflection_form"):
    answers: list[str] = []
    for prompt, initial in zip(PROMPTS, initial_answers):
        answers.append(
            st.text_area(prompt, value=initial, height=120, key=f"ans_{prompt}")
        )
    saved = st.form_submit_button("Save reflection", type="primary")

if saved:
    content = build_content(answers)
    repo.save_reflection(selected_monday, content)
    st.success(f"Saved reflection for week of {humanize_date(selected_monday)}.")

# ---------- AI summary placeholder ----------
SHOW_AI_SUMMARY = False  # Toggle on when the LLM seam is wired up
if SHOW_AI_SUMMARY:  # pragma: no cover
    st.divider()
    st.subheader("AI summary")
    summary = repo.summarize_week(selected_monday)
    if summary:
        st.write(summary)
    else:
        st.caption("No AI summary available yet.")

st.divider()

# ---------- Past reflections ----------
st.subheader("Past reflections")
past = [r for r in repo.list_reflections() if r.week_start != selected_monday]
if not past:
    st.caption("No prior reflections.")
else:
    for r in past:
        age_weeks = (today - r.week_start).days // 7
        with st.expander(
            f"Week of {humanize_date(r.week_start)}  ·  {age_weeks} week(s) ago",
            expanded=False,
        ):
            st.markdown(r.content if r.content.strip() else "_(empty)_")
