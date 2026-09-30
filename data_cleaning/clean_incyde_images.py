# the INCYDE dataset (download + unzip Cropped_cyclone_data.zip from the Zenodo link first, point IMG_DIR at the extracted folder)

import os
from pathlib import Path

import numpy as np
import pandas as pd
from PIL import Image, UnidentifiedImageError

IMG_DIR = Path("incyde_raw")          # <- point this at the extracted INCYDE folder
OUT_DIR = Path("incyde_cleaned")      # cleaned/resized copies go here
MANIFEST_PATH = "incyde_manifest_CLEANED.csv"

TARGET_SIZE = (224, 224)              # standard input size for CNN backbones (ResNet/VGG)
CLASS_NAMES = ["NORMAL", "CYCLONIC", "SEVERE", "VERY_SEVERE", "EXTREME", "SUPER"]


def is_valid_image(path: Path) -> bool:
    """Reject corrupted/truncated files instead of letting them crash training later."""
    try:
        with Image.open(path) as im:
            im.verify()
        return True
    except (UnidentifiedImageError, OSError):
        return False


def build_manifest(img_dir: Path) -> pd.DataFrame:
    rows = []
    for class_name in CLASS_NAMES:
        class_dir = img_dir / class_name
        if not class_dir.exists():
            print(f"WARNING: expected class folder not found: {class_dir}")
            continue
        for f in class_dir.glob("*"):
            if f.suffix.lower() not in {".png", ".jpg", ".jpeg", ".tif", ".h5"}:
                continue
            rows.append({"path": str(f), "label": class_name})
    return pd.DataFrame(rows)


def clean_and_export(manifest: pd.DataFrame) -> pd.DataFrame:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    kept_rows = []

    for _, row in manifest.iterrows():
        src = Path(row["path"])

        # 1. Reject corrupted files up front
        if not is_valid_image(src):
            continue

        try:
            with Image.open(src) as im:
                im = im.convert("L")               # single-channel IR brightness temp

                # 2. Reject near-blank / sensor-dropout frames (near-constant
                #    pixel value usually means a corrupted downlink, not real sky)
                arr = np.array(im)
                if arr.std() < 2.0:
                    continue

                # 3. Resize to a consistent CNN input size
                im = im.resize(TARGET_SIZE)

                # 4. Normalize brightness temperature to [0, 1] the same way
                #    the source papers do (180K-310K -> 0-255 -> 0-1)
                arr = np.array(im).astype("float32") / 255.0

                out_path = OUT_DIR / row["label"] / src.name
                out_path.parent.mkdir(parents=True, exist_ok=True)
                Image.fromarray((arr * 255).astype("uint8")).save(out_path)

            kept_rows.append({"path": str(out_path), "label": row["label"]})
        except Exception as e:
            print(f"Skipping {src} ({e})")

    cleaned = pd.DataFrame(kept_rows)

    # 5. Drop exact duplicate frames (INCYDE's augmentation step can leave
    #    near-identical repeats across sequential 30-min captures)
    cleaned = cleaned.drop_duplicates(subset="path")

    return cleaned


if __name__ == "__main__":
    manifest = build_manifest(IMG_DIR)
    print(f"Found {len(manifest)} candidate images across {manifest['label'].nunique()} classes")

    cleaned = clean_and_export(manifest)
    cleaned.to_csv(MANIFEST_PATH, index=False)
    print(f"Kept {len(cleaned)} usable images -> {MANIFEST_PATH}")
    print(cleaned["label"].value_counts())
