# Cleans: india_cyclone_track_observations_1982_2026.csv  (IMD, one row per 3-hourly fix)

import numpy as np
import pandas as pd

IN_PATH = "india_cyclone_track_observations_1982_2026.csv"
OUT_PATH = "india_cyclone_track_observations_CLEANED.csv"

GRADE_ORDER = ["D", "DD", "CS", "SCS", "VSCS", "ESCS", "SuCS"]


def clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # 1. Parse timestamps
    df["time"] = pd.to_datetime(df["time"], errors="coerce")

    # 2. Drop columns that are >90% empty and add little value for
    sparse_cols = ["oci", "oci_diameter"]
    print("Dropping sparse columns:", sparse_cols,
          "(>90% missing —", df[sparse_cols].isna().mean().round(2).to_dict(), ")")
    df = df.drop(columns=sparse_cols)

    # 3. Remove fixes IMD itself flags as suspect, rather than silently
    removed = df[df["pos_suspect"] | df["date_suspect"]]
    df = df[~(df["pos_suspect"] | df["date_suspect"])].copy()
    print(f"Removed {len(removed)} IMD-flagged suspect fixes (kept {len(df)})")

    # 4. Sort so per-storm interpolation is chronologically correct
    df = df.sort_values(["storm_id", "step"]).reset_index(drop=True)

    # 5. Per-storm interpolation for wind/pressure gaps *within* a track
    for col in ["wind", "pressure", "pressure_drop", "ci_no"]:
        df[col] = df.groupby("storm_id")[col].transform(
            lambda s: s.interpolate(method="linear", limit_direction="both")
        )

    # 6. grade: forward/back-fill within a storm only — a storm's intensity
    df["grade"] = df.groupby("storm_id")["grade"].transform(lambda s: s.ffill().bfill())
    df["grade"] = pd.Categorical(df["grade"], categories=GRADE_ORDER, ordered=True)

    # 7. Bounds check on lat/lon (should be inside the North Indian Ocean box)
    out_of_box = ~df["lat"].between(0, 30) | ~df["lon"].between(40, 100)
    if out_of_box.any():
        print(f"WARNING: {out_of_box.sum()} fixes fall outside the expected NIO lat/lon box — inspect")

    # 8. Drop any fix still missing lat/lon after all this — position is
    before = len(df)
    df = df.dropna(subset=["lat", "lon"])
    print(f"Dropped {before - len(df)} rows with unrecoverable missing position")

    # 9. Deduplicate exact repeat fixes
    df = df.drop_duplicates(subset=["storm_id", "time"])

    return df


if __name__ == "__main__":
    raw = pd.read_csv(IN_PATH)
    cleaned = clean(raw)
    cleaned.to_csv(OUT_PATH, index=False)
    print(f"Wrote {len(cleaned)} rows -> {OUT_PATH}")
    print("Remaining nulls:\n", cleaned.isna().sum()[cleaned.isna().sum() > 0])
