#Cleans: india_cyclone_storm_summary_1982_2026.csv  (IMD RSMC New Delhi, one row per storm)
import pandas as pd

IN_PATH = "india_cyclone_storm_summary_1982_2026.csv"
OUT_PATH = "india_cyclone_storm_summary_CLEANED.csv"

GRADE_ORDER = ["D", "DD", "CS", "SCS", "VSCS", "ESCS", "SuCS"]
GRADE_LABEL = {
    "D": "Depression", "DD": "Deep Depression", "CS": "Cyclonic Storm",
    "SCS": "Severe Cyclonic Storm", "VSCS": "Very Severe Cyclonic Storm",
    "ESCS": "Extremely Severe Cyclonic Storm", "SuCS": "Super Cyclonic Storm",
}


def clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # 1. Parse timestamps
    df["start_time"] = pd.to_datetime(df["start_time"], errors="coerce")
    df["end_time"] = pd.to_datetime(df["end_time"], errors="coerce")

    # 2. Duration feature (often useful for prediction models)
    df["duration_hours"] = (df["end_time"] - df["start_time"]).dt.total_seconds() / 3600

    # 3. Drop storms with no valid peak_grade at all — can't be used as a
    #    classification label (2 rows in the current file)
    before = len(df)
    df = df.dropna(subset=["peak_grade"])
    print(f"Dropped {before - len(df)} rows with missing peak_grade")

    # 4. Standardize grade to an ordered category (lets you do ordinal
    #    classification instead of plain multi-class if you want)
    df["peak_grade"] = pd.Categorical(df["peak_grade"], categories=GRADE_ORDER, ordered=True)
    df["peak_grade_label"] = df["peak_grade"].map(GRADE_LABEL)

    # 5. Unnamed storms: keep the row (a depression with no name is still a
    #    valid data point) but make the missingness explicit rather than NaN
    df["name"] = df["name"].fillna("UNNAMED")

    # 6. max_wind / min_pressure: don't invent values. Flag instead of impute,
    #    since imputing wind speed would bias an intensity-prediction model.
    df["max_wind_missing"] = df["max_wind"].isna()
    df["min_pressure_missing"] = df["min_pressure"].isna()

    # 7. Sanity-bound check (IMD wind speeds are 3-min sustained, in knots;
    #    anything outside this range is almost certainly a data-entry error)
    bad_wind = df["max_wind"].notna() & ((df["max_wind"] < 15) | (df["max_wind"] > 165))
    if bad_wind.any():
        print(f"WARNING: {bad_wind.sum()} rows have out-of-range max_wind — inspect manually")

    # 8. Deduplicate on storm_id (shouldn't happen, but cheap to guard)
    df = df.drop_duplicates(subset="storm_id")

    # 9. Sort chronologically
    df = df.sort_values("start_time").reset_index(drop=True)

    return df


if __name__ == "__main__":
    raw = pd.read_csv(IN_PATH)
    cleaned = clean(raw)
    cleaned.to_csv(OUT_PATH, index=False)
    print(f"Wrote {len(cleaned)} rows -> {OUT_PATH}")
    print(cleaned["peak_grade_label"].value_counts())
