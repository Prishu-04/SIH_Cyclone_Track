# ibtracs.NI.list.v04r01.csv  (download first from the ERDDAP/NCEI link, filtered to basin = NI, then place it next to this script)
import pandas as pd

IN_PATH = "ibtracs.NI.list.v04r01.csv"
OUT_PATH = "ibtracs_NI_CLEANED.csv"

# IBTrACS ships a units/metadata row as row 2 of the CSV -- skip it
SKIPROWS = [1]

KEEP_COLS = [
    "SID", "SEASON", "BASIN", "SUBBASIN", "NAME", "ISO_TIME",
    "LAT", "LON", "WMO_WIND", "WMO_PRES", "USA_WIND", "USA_PRES",
    "NATURE", "DIST2LAND", "LANDFALL",
]


def clean(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # 1. Keep only columns you'll realistically use -- IBTrACS ships 160+
    df = df[[c for c in KEEP_COLS if c in df.columns]]

    # 2. Parse time
    df["ISO_TIME"] = pd.to_datetime(df["ISO_TIME"], errors="coerce")

    # 3. IBTrACS stores missing numeric data as blank cells in CSV form
    for col in ["LAT", "LON", "WMO_WIND", "WMO_PRES", "USA_WIND", "USA_PRES", "DIST2LAND"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
            df.loc[df[col] <= -999, col] = pd.NA

    # 4. Prefer WMO-sanctioned wind/pressure; fall back to USA/JTWC values
    df["wind_best"] = df["WMO_WIND"].fillna(df.get("USA_WIND"))
    df["pres_best"] = df["WMO_PRES"].fillna(df.get("USA_PRES"))

    # 5. Restrict to the North Indian basin explicitly (in case you downloaded
    if "BASIN" in df.columns:
        before = len(df)
        df = df[df["BASIN"] == "NI"]
        print(f"Filtered to NI basin: {before} -> {len(df)} rows")

    # 6. Drop duplicate fixes
    df = df.drop_duplicates(subset=["SID", "ISO_TIME"])

    # 7. Sort chronologically within each storm
    df = df.sort_values(["SID", "ISO_TIME"]).reset_index(drop=True)

    return df


if __name__ == "__main__":
    raw = pd.read_csv(IN_PATH, skiprows=SKIPROWS, low_memory=False)
    cleaned = clean(raw)
    cleaned.to_csv(OUT_PATH, index=False)
    print(f"Wrote {len(cleaned)} rows -> {OUT_PATH}")
