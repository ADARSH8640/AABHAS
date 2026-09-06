from pathlib import Path
from PIL import Image

DATASET_DIR = Path(r"C:\RockfallAI\dataset")

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}

bad_files = []

for path in DATASET_DIR.rglob("*"):
    if not path.is_file():
        continue

    if path.suffix.lower() not in IMAGE_EXTENSIONS:
        continue

    try:
        with Image.open(path) as image:
            image.verify()

    except Exception as e:
        bad_files.append((path, str(e)))

print(f"Invalid images found: {len(bad_files)}")

for path, error in bad_files:
    print("\nINVALID:")
    print(path)
    print("ERROR:", error)