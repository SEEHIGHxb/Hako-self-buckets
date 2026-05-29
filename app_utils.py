"""Shared helpers for the Streamlit UI. Keeps streamlit imports out of the core package."""
from __future__ import annotations

from datetime import date

import streamlit as st

from self_buckets.repository import Repository


@st.cache_resource
def get_repo() -> Repository:
    """A single Repository instance for the app lifetime."""
    return Repository()


def format_hours(h: float) -> str:
    if h == int(h):
        return f"{int(h)} h"
    return f"{h:.1f} h"


def progress_pct(actual: float, target: float) -> float:
    if target <= 0:
        return 0.0
    return min(1.0, actual / target)


def humanize_date(d: date) -> str:
    return d.strftime("%A, %d %b %Y")
