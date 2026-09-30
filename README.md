# CycloTrack India — AI/ML System for Tropical Cyclone Identification, Classification & Prediction

**Smart India Hackathon — Problem Statement**

> To develop an Artificial Intelligence (AI) / Machine Learning (ML) based
> system for identification, classification, and prediction of different
> tropical cyclone patterns over India, using multi-source satellite data.

**Scope:** North Indian Ocean tropical cyclones (Bay of Bengal + Arabian Sea).

---

## 1. What this repository is

This is the working repository for the project, reorganized into one
directory structure that holds everything currently built or in progress:

- Four years of India-specific cyclone **datasets** (IMD best-track, 1982–2026)
- **Data-cleaning scripts** for those datasets (and templates for the two
  external datasets — IBTrACS, INCYDE — that fill in satellite imagery and
  cross-validation)
- A **backend** (FastAPI) with real, persistent routes for auth, analysis,
  cyclone data, history, reports, and emergency/shelter services
- An **ML** package (`ml/`) with the data-loading/validation layer already
  working, and detection/classification/intensity/trajectory/fusion modules
  scaffolded but **not yet trained**
- A static **frontend** (HTML/CSS/JS) already wired to the live GDACS feed and
  to several backend routes

**Read `PROJECT_FLOW.md` for the full data → cleaning → model → API → frontend
pipeline, with a diagram of which file talks to which.**

---

## 2. Directory structure

```
CycloTrack-India-SIH/
├── README.md                  ← this file
├── PROJECT_FLOW.md            ← end-to-end flow diagram (data → models → API → UI)
├── updates.md                 ← dated changelog of fixes/features already shipped
│
├── docs/                      ← reference material (problem pipeline + team work plans)
│   ├── SIH_Cyclone_Project_Pipeline.pdf
│   ├── CycloTrack_Dhanesh_Work_Plan.pdf
│   ├── CycloTrack_Yuvraj_Work_Plan.pdf
│   └── proposed_java_fastapi_architecture.jpeg   ← see the note in §5 below
│
├── datasets/                  ← raw + external + cleaned data (see datasets/README.md)
│   ├── data_dictionary.csv
│   ├── raw/                   ← IMD storm summary / track observations / remarks (included)
│   ├── external/              ← IBTrACS, INCYDE, MOSDAC (you download these)
│   └── processed/             ← output of data_cleaning/ scripts (empty until run)
│
├── data_cleaning/              ← one script per dataset, run in order (see its README.md)
│   ├── clean_storm_summary.py
│   ├── clean_track_observations.py
│   ├── clean_remarks.py
│   ├── clean_ibtracs.py
│   └── clean_incyde_images.py
│
├── ml/                          ← model training + inference (Dhanesh's primary ownership)
│   ├── data/                    ← loader.py, splitter.py, validator.py — WORKING
│   ├── preprocessing/           ← feature engineering — scaffolding
│   ├── detection/               ← cyclone detection in satellite frames — scaffolding
│   ├── classification/          ← grade classification (peak_grade_label) — scaffolding
│   ├── intensity/                ← wind/pressure regression — scaffolding
│   ├── trajectory/               ← track/position prediction — scaffolding
│   ├── fusion/                   ← image + sequence fusion model — scaffolding
│   ├── explainability/           ← XAI layer for predictions — scaffolding
│   ├── training/                 ← per-task training entry points
│   ├── inference/                ← model-loading + prediction interfaces for the API
│   ├── models/                   ← trained weights land here (empty — nothing trained yet)
│   ├── sample_data/              ← small fixtures for tests
│   ├── notebooks/                ← EDA
│   ├── reports/                  ← metrics, figures, logs
│   ├── tests/                    ← unit tests for the data layer
│   ├── utils/, config/           ← seeding, logging, config
│   └── README.md
│
├── backend/                     ← FastAPI backend (Yuvraj's primary ownership)
│   ├── app/
│   │   └── main.py               ← current single-file app (657 lines — see §4)
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
│
├── frontend/                    ← static HTML/CSS/JS UI
│   ├── index.html, cyclone_region.html, history.html, report.html,
│   │   responder.html, missing-person.html, response-center.html, …
│   └── assets/
│
└── CSVs_legacy_demo/             ← older synthetic demo CSVs kept for backward compatibility
```

---

## 3. The two halves of the problem statement, and what covers them

| Half of the problem statement | Covered by |
|---|---|
| **Identification & classification** of cyclone patterns from satellite imagery | `ml/detection/`, `ml/classification/`, INCYDE dataset (satellite IR frames, `datasets/external/incyde/`) |
| **Prediction** of intensity and trajectory from track/sensor data | `ml/intensity/`, `ml/trajectory/`, IMD track observations (`datasets/raw/india_cyclone_track_observations_1982_2026.csv`) |
| **Multi-source** requirement | IMD (primary, India-specific) + IBTrACS (independent multi-agency cross-check) + INCYDE/MOSDAC (satellite imagery) |
| Tying it together for a real system, not just a notebook | `backend/` (persistence, auth, API) + `frontend/` (map, dashboard, reports) |

## 4. Honest status: what's real vs. what's still a stub

This project deliberately tracks **what's actually working** rather than
demoing fabricated numbers:

- ✅ **Working:** IMD data cleaning (3 of 5 scripts tested against real data),
  the `ml/data/` loading + validation + splitting layer, the FastAPI skeleton,
  the live GDACS cyclone feed, most of the static frontend.
- 🚧 **Scaffolded but not trained:** every ML task module
  (`detection/classification/intensity/trajectory/fusion`) — directories and
  interfaces exist, but there are **no trained model weights** in `ml/models/`
  yet. Endpoints that would serve these predictions must return an explicit
  "model unavailable" state rather than invented numbers, until training is
  done (see the Definition of Done in both work plans in `docs/`).
- 🚧 **Needs restructuring:** `backend/app/main.py` is currently one 657-line
  file. The work plans call for splitting it into
  `routers/ schemas/ models/ services/ repositories/ core/ database/ tests/`
  — this restructuring is Yuvraj's Phase 1 (see `docs/CycloTrack_Yuvraj_Work_Plan.pdf`).
- ⬜ **Not started:** IBTrACS and INCYDE data acquisition (scripts are ready,
  the datasets themselves need to be downloaded — see `datasets/README.md`).

## 5. Note on architecture — a discrepancy to resolve

Two different architecture descriptions were provided and they **do not
match** each other or the current code, so this is flagged rather than
silently picked:

- **`docs/CycloTrack_Dhanesh_Work_Plan.pdf` and `docs/CycloTrack_Yuvraj_Work_Plan.pdf`**
  (and the code actually in `backend/`) describe a **single Python/FastAPI
  backend** for everything — auth, database, ML inference orchestration —
  with Dhanesh owning ML/data engineering and Yuvraj owning the FastAPI
  backend/database/auth.
- **`docs/proposed_java_fastapi_architecture.jpeg`** describes a *different*
  split: a **Java/Spring Boot** layer (owned by Dhanesh) sitting in front of
  PostgreSQL/PostGIS/Auth, talking over REST/JSON to a separate
  **Python/FastAPI** ML service (owned by Yuvraj).

These two sources disagree on both the **technology** (one FastAPI backend vs.
Java Spring Boot + separate FastAPI ML service) and the **ownership split**
(who owns backend vs. ML). The current codebase in `backend/` and `ml/` is
Python throughout and matches the work plans, not the image. Since only one of
these can be the real target architecture, this needs a decision from the
team before Phase 1 restructuring work goes further in either direction —
everything in this zip is organized around the work-plan version (single
FastAPI backend) since that's what's actually implemented today.

## 6. Getting started

```bash
# 1. Data
cd data_cleaning && python3 clean_storm_summary.py && python3 clean_track_observations.py && python3 clean_remarks.py
# (download IBTrACS/INCYDE per datasets/README.md, then run the other two scripts)

# 2. Backend
cd ../backend
cp .env.example .env   # fill in DATABASE_URL, JWT secret, etc.
pip install -r requirements.txt --break-system-packages
uvicorn app.main:app --reload

# 3. ML (once you're training)
cd ../ml
pip install -r requirements.txt --break-system-packages
python3 -m pytest tests/

# 4. Frontend
cd ../frontend && python3 -m http.server 8080
```

## 7. Team

| Owner | Responsibility |
|---|---|
| **Dhanesh** | ML/data engineering, real cyclone/provider integration, prediction services, risk intelligence, emergency data services, frontend integration |
| **Yuvraj** | Backend architecture, database, authentication, API orchestration, persistence, reports, security, final integration |

Full phase-by-phase task breakdowns for both are in `docs/`.
