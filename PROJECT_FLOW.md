# Project Flow — Directory-to-Directory / File-to-File

This traces exactly which folder or script hands off to which other folder or
script, end to end: raw data → cleaning → EDA/features → model training →
trained weights → backend inference → API → frontend.

## 1. High-level pipeline

```mermaid
flowchart TD
    subgraph S1["Stage 1 — datasets/"]
        A1["datasets/raw/*.csv\n(IMD storm summary, track obs, remarks)"]
        A2["datasets/external/ibtracs/, /incyde/, /mosdac/\n(downloaded separately)"]
    end

    subgraph S2["Stage 2 — data_cleaning/"]
        B1[clean_storm_summary.py]
        B2[clean_track_observations.py]
        B3[clean_remarks.py]
        B4[clean_ibtracs.py]
        B5[clean_incyde_images.py]
    end

    C1["datasets/processed/*_CLEANED.csv\n+ cleaned INCYDE image manifest"]

    subgraph S3["Stage 3 — ml/"]
        D1["ml/data/loader.py, validator.py, splitter.py"]
        D2["ml/preprocessing/\n(feature engineering, lag features)"]
        D3["ml/detection/ + ml/classification/\n(image branch)"]
        D4["ml/intensity/ + ml/trajectory/\n(sequence branch)"]
        D5["ml/fusion/\n(combines both branches)"]
        D6["ml/training/*\n(entry points that call D3–D5)"]
        D7["ml/models/\n(trained weights saved here)"]
    end

    subgraph S4["Stage 4 — backend/"]
        E1["ml/inference/\n(loads ml/models/ weights)"]
        E2["backend/app/main.py\n(routes call into ml/inference/)"]
        E3["(database: users, analyses,\ncyclone observations, predictions)"]
    end

    subgraph S5["Stage 5 — frontend/"]
        F1["frontend/cyclone_region.html, history.html,\nreport.html, responder.html, ..."]
    end

    A1 --> B1 --> C1
    A1 --> B2 --> C1
    A1 --> B3 --> C1
    A2 --> B4 --> C1
    A2 --> B5 --> C1

    C1 --> D1 --> D2
    D2 --> D3
    D2 --> D4
    D3 --> D5
    D4 --> D5
    D5 --> D6
    D3 --> D6
    D4 --> D6
    D6 --> D7

    D7 --> E1
    E1 --> E2
    E2 <--> E3
    E2 -- "REST/JSON" --> F1
```

## 2. Backend route → module map

Which file in `backend/app/main.py` is expected to call which `ml/` module
(per the two work plans in `docs/`):

```mermaid
flowchart LR
    subgraph API["backend/app/main.py routes"]
        R1["/api/v1/auth/*"]
        R2["/api/v1/analysis/upload, /run, /{id}, /status"]
        R3["/api/v1/predictions/detect"]
        R4["/api/v1/predictions/classify"]
        R5["/api/v1/predictions/intensity"]
        R6["/api/v1/predictions/trajectory"]
        R7["/api/v1/predictions/full-analysis"]
        R8["/api/v1/cyclones/live, /api/v1/cyclones"]
        R9["/api/v1/map"]
        R10["/api/v1/history, /reports/*"]
        R11["shelters / help-requests / missing-persons"]
    end

    subgraph ML["ml/ modules"]
        M1[ml/detection/]
        M2[ml/classification/]
        M3[ml/intensity/]
        M4[ml/trajectory/]
        M5[ml/fusion/]
    end

    EXT["GDACS external API"]
    DB[("PostgreSQL + PostGIS")]

    R1 --> DB
    R2 --> DB
    R3 --> M1 --> R3
    R4 --> M2 --> R4
    R5 --> M3 --> R5
    R6 --> M4 --> R6
    R7 --> M1
    R7 --> M2
    R7 --> M3
    R7 --> M4
    R7 --> M5
    R8 --> EXT
    R8 --> DB
    R9 --> DB
    R10 --> DB
    R11 --> DB
```

## 3. Frontend page → backend route map

```mermaid
flowchart LR
    P1["frontend/index.html"] --> RA["/api/v1/cyclones/live"]
    P2["frontend/cyclone_region.html"] --> RA
    P2 --> RB["/api/v1/map"]
    P3["frontend/history.html"] --> RC["/api/v1/history"]
    P4["frontend/report.html"] --> RD["/api/v1/reports/{id}/download"]
    P5["frontend/responder.html"] --> RE["/api/help-requests/inbox\n/api/v1/missing-persons"]
    P6["frontend/missing-person.html"] --> RF["missing-person submission endpoint"]
    P7["(planned) analysis/upload UI"] --> RG["/api/v1/analysis/upload, /run"]
```

## 4. Reading the diagrams

- **Solid data path (Stages 1→2→3):** nothing in `ml/` should ever read
  directly from `datasets/raw/` or `datasets/external/` — it always goes
  through the matching script in `data_cleaning/` first, landing in
  `datasets/processed/`.
- **Stage 3 fan-out:** `ml/preprocessing/` output feeds *two independent
  branches* — the image branch (`detection/`, `classification/`) and the
  sequence branch (`intensity/`, `trajectory/`) — which only meet again at
  `ml/fusion/`. Train and validate each branch on its own before wiring the
  fusion model.
- **Stage 3→4 handoff:** only `ml/models/` (trained weights) and
  `ml/inference/` (the loading/prediction interface) are consumed by the
  backend. `backend/app/main.py` should never import training code directly.
- **Cross-storm leakage:** when splitting train/test anywhere in Stage 3, split
  by `storm_id`, never by row — this is called out explicitly in the pipeline
  doc (`docs/SIH_Cyclone_Project_Pipeline.pdf`, Stage 6) and must hold for
  every one of `detection/classification/intensity/trajectory/fusion`.
