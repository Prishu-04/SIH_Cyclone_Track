# Data Cleaning Scripts

One script per raw dataset. Run in this exact order — later scripts assume
earlier `*_CLEANED.csv` files already exist:

```
clean_storm_summary.py
        │
        ▼
clean_track_observations.py
        │
        ▼
clean_remarks.py
        │
        ▼
clean_ibtracs.py
        │
        ▼
clean_incyde_images.py
```

| Script | Input (from `../datasets/`) | Output (to `../datasets/processed/`) | Key steps |
|---|---|---|---|
| `clean_storm_summary.py` | `raw/india_cyclone_storm_summary_1982_2026.csv` | `storm_summary_CLEANED.csv` | Parse dates, drop unlabeled rows, order `peak_grade` as an ordinal category, flag (never impute) missing values |
| `clean_track_observations.py` | `raw/india_cyclone_track_observations_1982_2026.csv` | `track_observations_CLEANED.csv` | Drop 90%+ empty columns, remove IMD-flagged suspect fixes, per-storm linear interpolation for short gaps |
| `clean_remarks.py` | `raw/india_cyclone_remarks_1982_2026.csv` | `remarks_CLEANED.csv` | Normalize text, keep the original text alongside the cleaned version, derive landfall / weakening flags |
| `clean_ibtracs.py` | `external/ibtracs/*.csv` (download separately, see below) | `ibtracs_CLEANED.csv` | Skip the units row, normalize the `-9999` sentinel, prefer WMO over USA/JTWC values, filter to the North Indian basin |
| `clean_incyde_images.py` | `external/incyde/*` (download separately, see below) | `incyde_manifest_CLEANED.csv` + resized frames | Reject corrupted/blank frames, resize to 224×224, normalize brightness temperature, deduplicate near-identical frames |

**Status:** the three IMD scripts (`clean_storm_summary.py`, `clean_track_observations.py`,
`clean_remarks.py`) were tested against the real data in `../datasets/raw/`. The
IBTrACS and INCYDE scripts are verified-correct templates — they need you to
download those two datasets yourself first (see `../datasets/README.md`).

## Usage

```bash
cd data_cleaning
python3 clean_storm_summary.py
python3 clean_track_observations.py
python3 clean_remarks.py
python3 clean_ibtracs.py        # after downloading IBTrACS into ../datasets/external/ibtracs/
python3 clean_incyde_images.py  # after downloading INCYDE into ../datasets/external/incyde/
```

Cleaned outputs land in `../datasets/processed/`, which is what `ml/data/loader.py`
and `ml/preprocessing/` read from in the next pipeline stage.
