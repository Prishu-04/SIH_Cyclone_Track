# Datasets

## `raw/` — already included in this zip

Sourced from **IMD RSMC New Delhi best-track records** (via the `imdtrack`
package), covering 1982–2026, India-specific. These three files are linked by
`storm_id`:

| File | Grain | Rows describe |
|---|---|---|
| `india_cyclone_storm_summary_1982_2026.csv` | one row per storm | peak grade, peak wind, min pressure, start/end time — **this is the classification target table** (`peak_grade_label`) |
| `india_cyclone_track_observations_1982_2026.csv` | one row per 3-hourly fix | lat/lon, wind, pressure, CI number per timestamp — **this is the prediction/sequence table** |
| `india_cyclone_remarks_1982_2026.csv` | one row per remark | free-text landfall/weakening notes per storm |

Full column-by-column meaning is in `data_dictionary.csv`.

## `external/` — you download these yourself

| Folder | Dataset | Get it from |
|---|---|---|
| `external/ibtracs/` | IBTrACS (NOAA/NCEI), 1980–present, global, North Indian basin subset | `ncei.noaa.gov/products/international-best-track-archive` or the ERDDAP portal `erddap.aoml.noaa.gov` |
| `external/incyde/` | INCYDE — 100k+ labeled INSAT IR frames, 2013–2021 | Zenodo `doi.org/10.5281/zenodo.8015544` (`Cropped_cyclone_data.zip`) |
| `external/mosdac/` | Raw INSAT-series imagery, 1982–present (optional, supplementary) | `mosdac.gov.in` (free account signup required) |

## `processed/`

Output of the `../data_cleaning/` scripts. Empty until you run those scripts —
this is what the ML pipeline (`../ml/`) actually trains on.

## Quick-start: pulling the primary (IMD) dataset yourself

```bash
pip install imdtrack --break-system-packages
python3 -c "import imdtrack as imd; bt = imd.load(); \
bt.observations.to_csv('obs.csv'); bt.storms.to_csv('storms.csv'); bt.remarks.to_csv('remarks.csv')"
```

(The `raw/` files in this zip are already-exported snapshots of this, so you
only need to re-run this if you want a refresh.)
