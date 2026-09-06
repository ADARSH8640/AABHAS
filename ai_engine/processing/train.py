from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import datasets, transforms

from ai_engine.models.rockfall_model import RockfallModel


# =========================================================
# PATHS
# =========================================================

PROJECT_DIR = Path(r"C:\RockfallAI")

DATASET_DIR = PROJECT_DIR / "dataset"

TRAIN_DIR = DATASET_DIR / "train"
VAL_DIR = DATASET_DIR / "validation"

CHECKPOINT_DIR = PROJECT_DIR / "ai_engine" / "models"

BEST_MODEL_PATH = (
    CHECKPOINT_DIR / "rockfall_model_best.pth"
)


# =========================================================
# CONFIGURATION
# =========================================================

IMAGE_SIZE = 224

BATCH_SIZE = 8

NUM_CLASSES = 2

NUM_EPOCHS = 10

LEARNING_RATE = 1e-4

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# =========================================================
# NORMALIZATION
# =========================================================

IMAGENET_MEAN = [
    0.485,
    0.456,
    0.406,
]

IMAGENET_STD = [
    0.229,
    0.224,
    0.225,
]


# =========================================================
# TRAINING AUGMENTATION
# =========================================================

train_transforms = transforms.Compose([

    transforms.RandomResizedCrop(
        IMAGE_SIZE,
        scale=(0.80, 1.0),
    ),

    transforms.RandomHorizontalFlip(
        p=0.5,
    ),

    transforms.RandomRotation(
        degrees=8,
    ),

    transforms.RandomAffine(
        degrees=0,
        translate=(0.05, 0.05),
        scale=(0.95, 1.05),
    ),

    transforms.ColorJitter(
        brightness=0.15,
        contrast=0.15,
        saturation=0.10,
        hue=0.02,
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        IMAGENET_MEAN,
        IMAGENET_STD,
    ),
])


# =========================================================
# VALIDATION TRANSFORMATION
# NO AUGMENTATION
# =========================================================

val_transforms = transforms.Compose([

    transforms.Resize(
        (IMAGE_SIZE, IMAGE_SIZE),
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        IMAGENET_MEAN,
        IMAGENET_STD,
    ),
])


# =========================================================
# DATASETS
# =========================================================

train_dataset = datasets.ImageFolder(
    TRAIN_DIR,
    transform=train_transforms,
)

val_dataset = datasets.ImageFolder(
    VAL_DIR,
    transform=val_transforms,
)


# =========================================================
# DATA LOADERS
# =========================================================

train_loader = DataLoader(
    train_dataset,
    batch_size=BATCH_SIZE,
    shuffle=True,
    num_workers=0,
)

val_loader = DataLoader(
    val_dataset,
    batch_size=BATCH_SIZE,
    shuffle=False,
    num_workers=0,
)


# =========================================================
# CLASS WEIGHTS
# =========================================================

class_counts = torch.bincount(
    torch.tensor(train_dataset.targets),
    minlength=NUM_CLASSES,
)

class_weights = (
    class_counts.sum().float()
    / (
        NUM_CLASSES
        * class_counts.float()
    )
)

class_weights = class_weights.to(DEVICE)


# =========================================================
# MODEL
# =========================================================

model = RockfallModel(
    num_classes=NUM_CLASSES,
)

model = model.to(DEVICE)


# =========================================================
# LOSS
# =========================================================

criterion = nn.CrossEntropyLoss(
    weight=class_weights,
)


# =========================================================
# OPTIMIZER
# =========================================================

optimizer = torch.optim.AdamW(
    model.parameters(),
    lr=LEARNING_RATE,
    weight_decay=1e-4,
)


# =========================================================
# TRAINING FUNCTION
# =========================================================

def train():

    print("=" * 60)
    print("ROCKFALL AI TRAINING")
    print("=" * 60)

    print(
        f"Device: {DEVICE}"
    )

    print(
        f"Training images: {len(train_dataset)}"
    )

    print(
        f"Validation images: {len(val_dataset)}"
    )

    print(
        f"Classes: {train_dataset.class_to_idx}"
    )

    print(
        f"Batch size: {BATCH_SIZE}"
    )

    print(
        f"Epochs: {NUM_EPOCHS}"
    )

    print("=" * 60)


    best_val_accuracy = 0.0


    # -----------------------------------------------------
    # EPOCH LOOP
    # -----------------------------------------------------

    for epoch in range(NUM_EPOCHS):

        # =================================================
        # TRAIN
        # =================================================

        model.train()

        running_loss = 0.0

        correct = 0

        total = 0


        for images, labels in train_loader:

            images = images.to(DEVICE)

            labels = labels.to(DEVICE)


            optimizer.zero_grad()


            outputs = model(images)


            loss = criterion(
                outputs,
                labels,
            )


            loss.backward()


            optimizer.step()


            running_loss += (
                loss.item()
                * images.size(0)
            )


            predictions = outputs.argmax(
                dim=1
            )


            correct += (
                predictions == labels
            ).sum().item()


            total += labels.size(0)


        train_loss = (
            running_loss / total
        )

        train_accuracy = (
            correct / total
        )


        # =================================================
        # VALIDATION
        # =================================================

        model.eval()

        val_correct = 0

        val_total = 0


        with torch.no_grad():

            for images, labels in val_loader:

                images = images.to(DEVICE)

                labels = labels.to(DEVICE)


                outputs = model(images)


                predictions = outputs.argmax(
                    dim=1
                )


                val_correct += (
                    predictions == labels
                ).sum().item()


                val_total += labels.size(0)


        val_accuracy = (
            val_correct / val_total
        )


        # =================================================
        # PRINT RESULTS
        # =================================================

        print(
            f"Epoch {epoch + 1}/{NUM_EPOCHS} | "
            f"Train Loss: {train_loss:.4f} | "
            f"Train Acc: {train_accuracy:.4f} | "
            f"Val Acc: {val_accuracy:.4f}"
        )


        # =================================================
        # SAVE BEST MODEL
        # =================================================

        if val_accuracy > best_val_accuracy:

            best_val_accuracy = val_accuracy


            CHECKPOINT_DIR.mkdir(
                parents=True,
                exist_ok=True,
            )


            torch.save(
                {
                    "model_state_dict":
                        model.state_dict(),

                    "val_accuracy":
                        val_accuracy,

                    "class_to_idx":
                        train_dataset.class_to_idx,

                    "class_weights":
                        class_weights.cpu(),

                    "image_size":
                        IMAGE_SIZE,
                },
                BEST_MODEL_PATH,
            )


            print(
                "  Saved best model:"
            )

            print(
                f"  {BEST_MODEL_PATH}"
            )


    # =====================================================
    # COMPLETE
    # =====================================================

    print()
    print("=" * 60)
    print("TRAINING COMPLETE")
    print("=" * 60)

    print(
        f"Best validation accuracy: "
        f"{best_val_accuracy:.4f}"
    )

    print(
        f"Best model: {BEST_MODEL_PATH}"
    )


# =========================================================
# IMPORTANT
# =========================================================
# Training ONLY starts when this file is executed directly.
#
# Importing this file will NOT start training.
# =========================================================

if __name__ == "__main__":
    train()