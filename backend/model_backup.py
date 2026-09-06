import torch
import torch.nn as nn
from torchvision.models import (
    convnext_tiny,
    ConvNeXt_Tiny_Weights,
    swin_t,
    Swin_T_Weights,
)
from torchvision import transforms
from PIL import Image
from pathlib import Path


# --------------------------------------------------
# Device
# --------------------------------------------------

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)


# --------------------------------------------------
# Rockfall Model
# --------------------------------------------------

class RockfallModel(nn.Module):

    def __init__(self, num_classes=2):

        super().__init__()

        # ------------------------------------------
        # ConvNeXt Tiny
        # ------------------------------------------

        self.convnext = convnext_tiny(
            weights=ConvNeXt_Tiny_Weights.DEFAULT
        )

        convnext_features = (
            self.convnext.classifier[-1].in_features
        )

        # Remove only the final ImageNet classifier.
        # Keep LayerNorm and Flatten because they
        # are part of the trained checkpoint.
        self.convnext.classifier[2] = nn.Identity()

        # ------------------------------------------
        # Swin Transformer Tiny
        # ------------------------------------------

        self.swin = swin_t(
            weights=Swin_T_Weights.DEFAULT
        )

        swin_features = (
            self.swin.head.in_features
        )

        self.swin.head = nn.Identity()

        # ------------------------------------------
        # Fusion classifier
        # ------------------------------------------

        fused_features = (
            convnext_features
            + swin_features
        )

        self.classifier = nn.Sequential(

            nn.Linear(
                fused_features,
                512
            ),

            nn.ReLU(),

            nn.Dropout(
                0.30
            ),

            nn.Linear(
                512,
                num_classes
            )
        )

    def forward(self, x):

        convnext_features = self.convnext(x)

        swin_features = self.swin(x)

        fused_features = torch.cat(
            [
                convnext_features,
                swin_features
            ],
            dim=1
        )

        return self.classifier(
            fused_features
        )


# --------------------------------------------------
# Model checkpoint
# --------------------------------------------------

MODEL_PATH = (
    Path(__file__).resolve().parent.parent
    / "models"
    / "rockfall_convnext_swin_best.pth"
)


# --------------------------------------------------
# Create model
# --------------------------------------------------

model = RockfallModel(
    num_classes=2
)


# --------------------------------------------------
# Load checkpoint
# --------------------------------------------------

checkpoint = torch.load(
    MODEL_PATH,
    map_location=DEVICE
)

model.load_state_dict(
    checkpoint["model_state_dict"]
)

model.to(DEVICE)

model.eval()


# --------------------------------------------------
# Image preprocessing
# --------------------------------------------------

eval_transform = transforms.Compose([

    transforms.Resize(
        (224, 224)
    ),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[
            0.485,
            0.456,
            0.406
        ],
        std=[
            0.229,
            0.224,
            0.225
        ]
    )
])


# --------------------------------------------------
# Class names
# --------------------------------------------------

CLASS_NAMES = {
    0: "Low Risk",
    1: "High Risk"
}


# --------------------------------------------------
# Prediction function
# --------------------------------------------------

def predict_image(image_path):

    image = Image.open(
        image_path
    ).convert("RGB")

    image_tensor = eval_transform(
        image
    )

    image_tensor = image_tensor.unsqueeze(
        0
    ).to(DEVICE)

    with torch.no_grad():

        logits = model(
            image_tensor
        )

        probabilities = torch.softmax(
            logits,
            dim=1
        )[0]

        predicted_class = torch.argmax(
            probabilities
        ).item()

    return {
        "risk": CLASS_NAMES[
            predicted_class
        ],

        "confidence": float(
            probabilities[
                predicted_class
            ]
        ),

        "low_risk_probability": float(
            probabilities[0]
        ),

        "high_risk_probability": float(
            probabilities[1]
        )
    }