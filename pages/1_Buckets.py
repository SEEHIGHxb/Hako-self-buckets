"""Buckets page — view and edit the categorization of interests."""
from __future__ import annotations

import pandas as pd
import streamlit as st

from app_utils import get_repo
from self_buckets.models import KIND_LABELS, KIND_ORDER

st.set_page_config(page_title="Hako — Buckets", layout="wide")
st.title("Buckets")
st.caption(
    "Your living categorization. Edit names, targets, notes, or active flag inline. "
    "Add new rows at the bottom of any table."
)

repo = get_repo()


def items_to_df(items) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "id": i.id,
                "Item": i.name,
                "Hours/week": i.target_hours_per_week,
                "Times/week": i.target_times_per_week,
                "Notes": i.notes,
                "Active": i.is_active,
            }
            for i in items
        ]
    )


def apply_edits(bucket_id: int, original_df: pd.DataFrame, edited_df: pd.DataFrame) -> int:
    """Diff edited rows against the original, persist changes, return count of writes."""
    writes = 0
    original_by_id = {int(row["id"]): row for _, row in original_df.iterrows() if pd.notna(row["id"])}

    for _, row in edited_df.iterrows():
        item_id = row.get("id")
        name = str(row.get("Item") or "").strip()
        if not name:
            continue
        hrs = row.get("Hours/week")
        times = row.get("Times/week")
        notes = str(row.get("Notes") or "")
        active = bool(row.get("Active", True))

        hrs_val = float(hrs) if pd.notna(hrs) else None
        times_val = int(times) if pd.notna(times) else None

        if pd.isna(item_id):
            # New row
            repo.create_item(
                bucket_id=bucket_id,
                name=name,
                target_hours_per_week=hrs_val,
                target_times_per_week=times_val,
                notes=notes,
                is_active=active,
            )
            writes += 1
            continue

        item_id = int(item_id)
        original = original_by_id.get(item_id)
        if original is None:
            continue

        # Check for changes
        orig_hrs = original["Hours/week"]
        orig_hrs_val = float(orig_hrs) if pd.notna(orig_hrs) else None
        orig_times = original["Times/week"]
        orig_times_val = int(orig_times) if pd.notna(orig_times) else None

        changed = (
            name != original["Item"]
            or hrs_val != orig_hrs_val
            or times_val != orig_times_val
            or notes != (original["Notes"] or "")
            or active != bool(original["Active"])
        )
        if not changed:
            continue

        repo.update_item(
            item_id,
            name=name,
            target_hours_per_week=hrs_val,
            clear_hours=hrs_val is None,
            target_times_per_week=times_val,
            clear_times=times_val is None,
            notes=notes,
            is_active=active,
        )
        writes += 1
    return writes


# Render a section per kind
buckets = {b.kind: b for b in repo.list_buckets()}

for kind in KIND_ORDER:
    bucket = buckets.get(kind)
    if not bucket:
        continue

    st.subheader(KIND_LABELS[kind])

    items = repo.list_items_by_kind(kind)
    df = items_to_df(items)

    edited = st.data_editor(
        df,
        key=f"editor_{kind}",
        num_rows="dynamic",
        column_config={
            "id": st.column_config.Column(disabled=True, width="small"),
            "Item": st.column_config.TextColumn(required=True, width="medium"),
            "Hours/week": st.column_config.NumberColumn(min_value=0.0, step=0.5, format="%.1f"),
            "Times/week": st.column_config.NumberColumn(min_value=0, step=1, format="%d"),
            "Notes": st.column_config.TextColumn(width="large"),
            "Active": st.column_config.CheckboxColumn(width="small"),
        },
        hide_index=True,
        width="stretch",
    )

    cols = st.columns([1, 5])
    with cols[0]:
        if st.button("Save changes", key=f"save_{kind}", type="primary"):
            n = apply_edits(bucket.id, df, edited)
            if n:
                st.success(f"Saved {n} change(s).")
                st.cache_resource.clear()
                st.rerun()
            else:
                st.info("No changes to save.")

    st.divider()
