from pathlib import Path
import random
import shutil

from PIL import Image


# ---------------------------------------------------------
# Source folders
# ---------------------------------------------------------

LOW_SOURCE = Path(r"C:\Users\adars\Music\low on sih")
HIGH_SOURCE = Path(r"C:\Users\adars\Music\high on sih")

DATASET_DIR = Path(r"C:\RockfallAI\dataset")

RANDOM_SEED = 42

TRAIN_RATIO = 0.70
VAL_RATIO = 0.15

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}


# ---------------------------------------------------------
# Find and validate images
# ---------------------------------------------------------

def get_valid_images(folder):
    valid_images = []
    invalid_images = []

    for path in folder.iterdir():

        if not path.is_file():
            continue

        if path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue

        try:
            with Image.open(path) as image:
                image.verify()

            valid_images.append(path)

        except Exception as error:
            invalid_images.append((path, str(error)))

    return valid_images, invalid_images


# ---------------------------------------------------------
# Split files
# ---------------------------------------------------------

def split_files(files):

    files = list(files)

    random.shuffle(files)

    total = len(files)

    train_end = int(total * TRAIN_RATIO)

    val_end = train_end + int(total * VAL_RATIO)

    train = files[:train_end]

    validation = files[train_end:val_end]

    test = files[val_end:]

    return train, validation, test


# ---------------------------------------------------------
# Copy files
# ---------------------------------------------------------

def copy_files(files, destination):

    destination.mkdir(
        parents=True,
        exist_ok=True,
    )

    for source in files:

        target = destination / source.name

        shutil.copy2(
            source,
            target,
        )


# ---------------------------------------------------------
# Prepare class
# ---------------------------------------------------------

def prepare_class(source, class_name):

    valid_images, invalid_images = get_valid_images(source)

    print(f"\n{class_name}")
    print("-" * 40)

    print(
        f"Valid images:   {len(valid_images)}"
    )

    print(
        f"Invalid images: {len(invalid_images)}"
    )

    if invalid_images:

        print("\nSkipped invalid files:")

        for path, error in invalid_images:

            print(
                f"  {path.name}"
            )

    train, validation, test = split_files(
        valid_images
    )

    copy_files(
        train,
        DATASET_DIR / "train" / class_name,
    )

    copy_files(
        validation,
        DATASET_DIR / "validation" / class_name,
    )

    copy_files(
        test,
        DATASET_DIR / "test" / class_name,
    )

    print(
        f"\nTrain:      {len(train)}"
    )

    print(
        f"Validation: {len(validation)}"
    )

    print(
        f"Test:       {len(test)}"
    )

    return len(valid_images), len(invalid_images)


# ---------------------------------------------------------
# Main
# ---------------------------------------------------------

def main():

    random.seed(RANDOM_SEED)

    if not LOW_SOURCE.exists():

        raise FileNotFoundError(
            f"Low-risk folder not found:\n{LOW_SOURCE}"
        )

    if not HIGH_SOURCE.exists():

        raise FileNotFoundError(
            f"High-risk folder not found:\n{HIGH_SOURCE}"
        )

    # Remove ONLY the generated dataset.
    if DATASET_DIR.exists():

        print(
            "Removing previous generated dataset..."
        )

        shutil.rmtree(DATASET_DIR)

    print("\nPreparing validated dataset...")

    low_valid, low_invalid = prepare_class(
        LOW_SOURCE,
        "class0",
    )

    high_valid, high_invalid = prepare_class(
        HIGH_SOURCE,
        "class1",
    )

    print("\n" + "=" * 50)
    print("DATASET PREPARATION COMPLETE")
    print("=" * 50)

    print(
        f"Low-risk valid:   {low_valid}"
    )

    print(
        f"Low-risk invalid: {low_invalid}"
    )

    print(
        f"High-risk valid:   {high_valid}"
    )

    print(
        f"High-risk invalid: {high_invalid}"
    )

    print(
        f"\nDataset location:\n{DATASET_DIR}"
    )


if __name__ == "__main__":
    main()