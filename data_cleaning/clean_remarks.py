# Cleans: india_cyclone_remarks_1982_2026.csv  (IMD free-text forecaster notes)

import re
import pandas as pd

IN_PATH = "india_cyclone_remarks_1982_2026.csv"
OUT_PATH = "india_cyclone_remarks_CLEANED.csv"


def normalize_text(text: str) -> str:
    text = text.strip()
    text = re.sub(r"\s+", " ", text)          # collapse repeated whitespace
    text = text.upper()                        # IMD mixes case inconsistently; standardize
    text = re.sub(r"[^\w\s./-]", "", text)      # strip stray punctuation, keep useful chars
    return text


def clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # 1. Parse date
    df["date"] = pd.to_datetime(df["date"], errors="coerce")

    # 2. Drop rows with no remark text at all
    before = len(df)
    df = df.dropna(subset=["remark"])
    print(f"Dropped {before - len(df)} rows with empty remark")

    # 3. Normalize text but KEEP the original alongside it — never
    df["remark_original"] = df["remark"]
    df["remark_clean"] = df["remark"].apply(normalize_text)

    # 4. Deduplicate identical remarks attached to the same storm+date
    df = df.drop_duplicates(subset=["storm_id", "date", "remark_clean"])

    # 5. Simple derived flags useful as features (landfall mention, weakening
    df["mentions_landfall"] = df["remark_clean"].str.contains(
        r"\bCROSS|LANDFALL\b", regex=True, na=False
    )
    df["mentions_weakening"] = df["remark_clean"].str.contains(
        r"\bWEAKEN|WML\b", regex=True, na=False
    )

    df = df.sort_values(["storm_id", "date"]).reset_index(drop=True)
    return df


if __name__ == "__main__":
    raw = pd.read_csv(IN_PATH)
    cleaned = clean(raw)
    cleaned.to_csv(OUT_PATH, index=False)
    print(f"Wrote {len(cleaned)} rows -> {OUT_PATH}")
    print("Landfall-mentioning remarks:", cleaned["mentions_landfall"].sum())
