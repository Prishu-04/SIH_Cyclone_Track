"Train/validation/test splitting for cyclone track data."
from __future__ import annotations

from typing import Optional, Tuple

import numpy as np
import pandas as pd

from utils.logger import get_logger

logger = get_logger(__name__)


def split_by_storm(
    df: pd.DataFrame,
    storm_col: str = "storm_id",
    time_col: str = "timestamp",
    train_frac: float = 0.70,
    val_frac: float = 0.15,
    test_frac: float = 0.15,
    random_seed: Optional[int] = 42,
    chronological: bool = True,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    total = train_frac + val_frac + test_frac
    if not np.isclose(total, 1.0, atol=1e-6):
        raise ValueError(f"train_frac + val_frac + test_frac must sum to 1.0, got {total}")

    if storm_col not in df.columns:
        raise ValueError(f"split_by_storm: '{storm_col}' not found in DataFrame columns.")

    if chronological:
        if time_col not in df.columns:
            raise ValueError(
                f"split_by_storm: chronological=True requires '{time_col}' column."
            )
        storm_start = df.groupby(storm_col)[time_col].min().sort_values()
        storm_ids = storm_start.index.to_numpy()
    else:
        storm_ids = df[storm_col].unique()
        rng = np.random.default_rng(random_seed)
        rng.shuffle(storm_ids)

    n = len(storm_ids)
    n_train = int(round(n * train_frac))
    n_val = int(round(n * val_frac))
    # give any rounding remainder to test so all storms are always covered
    n_test = n - n_train - n_val

    train_ids = set(storm_ids[:n_train])
    val_ids = set(storm_ids[n_train : n_train + n_val])
    test_ids = set(storm_ids[n_train + n_val :])

    train_df = df[df[storm_col].isin(train_ids)].reset_index(drop=True)
    val_df = df[df[storm_col].isin(val_ids)].reset_index(drop=True)
    test_df = df[df[storm_col].isin(test_ids)].reset_index(drop=True)

    # sanity check: no storm should appear in more than one split
    overlap = (train_ids & val_ids) | (train_ids & test_ids) | (val_ids & test_ids)
    if overlap:
        raise AssertionError(f"Storm leakage detected across splits: {overlap}")

    logger.info(
        f"split_by_storm: {n} storms -> train={len(train_ids)} ({len(train_df)} rows), "
        f"val={len(val_ids)} ({len(val_df)} rows), test={len(test_ids)} ({len(test_df)} rows), "
        f"chronological={chronological}"
    )

    if chronological:
        logger.info(
            f"  train storms: {storm_start.index[0]!s} .. {storm_start.index[n_train-1]!s} "
            f"(by first-obs date {storm_start.iloc[0]} .. {storm_start.iloc[n_train-1]})"
        )

    return train_df, val_df, test_df
