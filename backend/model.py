# ============================================================
# ROCKFALL AI — EFFICIENTNET-B0 INFERENCE MODEL
# ============================================================

from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
from PIL import Image, ImageOps
from torchvision import transforms
from torchvision.models import efficientnet_b0


# ============================================================
# DEVICE
# ============================================================

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

print("=" * 60)
print("ROCKFALL AI MODEL")
print("=" * 60)
print("Device:", DEVICE)


# ============================================================
# IMPORT CONFIGURATION
# ============================================================

from backend.config import MODEL_PATH


# ============================================================
# CLASS NAMES
# ============================================================

CLASS_NAMES = {
    0: "Low Risk",
    1: "High Risk",
}


# ============================================================
# PRODUCTION THRESHOLD
# ============================================================

# Selected using the validation-set threshold analysis.
# P(High Risk) >= 0.61 -> High Risk
# P(High Risk) <  0.61 -> Low Risk

HIGH_RISK_THRESHOLD = 0.61


# ============================================================
# IMAGE PREPROCESSING
# ============================================================

# Must match the evaluation preprocessing used during training.

eval_transform = transforms.Compose([
    transforms.Resize((224, 224)),

    transforms.ToTensor(),

    transforms.Normalize(
        mean=[
            0.485,
            0.456,
            0.406,
        ],
        std=[
            0.229,
            0.224,
            0.225,
        ],
    ),
])


# ============================================================
# CREATE EFFICIENTNET-B0
# ============================================================

def create_model():

    model = efficientnet_b0(
        weights=None
    )

    num_features = (
        model.classifier[1].in_features
    )

    # Must match training architecture.
    model.classifier = nn.Sequential(
        nn.Dropout(0.30),
        nn.Linear(
            num_features,
            2
        ),
    )

    return model


# ============================================================
# LOAD MODEL
# ============================================================

print("Loading model...")
print("Checkpoint:", MODEL_PATH)

if not MODEL_PATH.exists():

    raise FileNotFoundError(
        f"EfficientNet-B0 checkpoint not found: "
        f"{MODEL_PATH}"
    )


model = create_model()


checkpoint = torch.load(
    MODEL_PATH,
    map_location=DEVICE,
)


# ============================================================
# LOAD CHECKPOINT
# ============================================================

if "model_state_dict" not in checkpoint:

    raise RuntimeError(
        "Invalid checkpoint: "
        "'model_state_dict' not found."
    )


model.load_state_dict(
    checkpoint["model_state_dict"]
)


# ============================================================
# MOVE MODEL TO DEVICE
# ============================================================

model.to(DEVICE)


# ============================================================
# EVALUATION MODE
# ============================================================

model.eval()


# ============================================================
# CHECKPOINT INFORMATION
# ============================================================

print()
print("Model loaded successfully.")

if "epoch" in checkpoint:

    print(
        "Checkpoint epoch:",
        checkpoint["epoch"]
    )

if "val_accuracy" in checkpoint:

    print(
        "Validation accuracy:",
        checkpoint["val_accuracy"]
    )

if "val_f1" in checkpoint:

    print(
        "Validation F1:",
        checkpoint["val_f1"]
    )

if "model" in checkpoint:

    print(
        "Checkpoint model:",
        checkpoint["model"]
    )

if "class_to_idx" in checkpoint:

    print(
        "Class mapping:",
        checkpoint["class_to_idx"]
    )

print(
    "Architecture:",
    "EfficientNet-B0"
)

print(
    "Classes:",
    CLASS_NAMES
)

print(
    "High Risk threshold:",
    HIGH_RISK_THRESHOLD
)

print(
    "Evaluation mode:",
    not model.training
)

print("=" * 60)


# ============================================================
# PREDICTION FUNCTION
# ============================================================

def predict_image(image_path):
    """
    Run EfficientNet-B0 inference on a single image.

    Returns:
        dict containing:
        - risk
        - confidence
        - low_risk_probability
        - high_risk_probability
    """

    # --------------------------------------------------------
    # Validate image path
    # --------------------------------------------------------

    image_path = Path(image_path)

    if not image_path.exists():

        raise FileNotFoundError(
            f"Image not found: {image_path}"
        )

    # --------------------------------------------------------
    # Load image
    # --------------------------------------------------------

    try:

        image = Image.open(
            image_path
        ).convert("RGB")

    except Exception as e:

        raise ValueError(
            f"Unable to read image: {e}"
        )

    # --------------------------------------------------------
    # Preprocess
    # --------------------------------------------------------

    image_tensor = eval_transform(
        image
    )

    image_tensor = image_tensor.unsqueeze(
        0
    ).to(DEVICE)

    # --------------------------------------------------------
    # Inference
    # --------------------------------------------------------

    model.eval()

    with torch.no_grad():

        logits = model(
            image_tensor
        )

        probabilities = torch.softmax(
            logits,
            dim=1
        )[0]

    # --------------------------------------------------------
    # Probabilities
    # --------------------------------------------------------

    low_risk_probability = float(
        probabilities[0].item()
    )

    high_risk_probability = float(
        probabilities[1].item()
    )

    # --------------------------------------------------------
    # Threshold-based prediction
    # --------------------------------------------------------

    if high_risk_probability >= HIGH_RISK_THRESHOLD:

        predicted_class = 1

    else:

        predicted_class = 0

    # --------------------------------------------------------
    # Confidence
    # --------------------------------------------------------

    confidence = float(
        probabilities[predicted_class].item()
    )

    # --------------------------------------------------------
    # Result
    # --------------------------------------------------------

    return {

        "risk":
            CLASS_NAMES[predicted_class],

        "confidence":
            confidence,

        "low_risk_probability":
            low_risk_probability,

        "high_risk_probability":
            high_risk_probability,
    }


# ============================================================
# GRAD-CAM EXPLAINABILITY
# ============================================================

def generate_gradcam(
    image_path,
    output_path,
):
    """
    Generate a Grad-CAM visualization for EfficientNet-B0.

    The CAM is generated from the final convolutional
    feature layer.
    """

    # --------------------------------------------------------
    # Validate input
    # --------------------------------------------------------

    image_path = Path(image_path)
    output_path = Path(output_path)

    if not image_path.exists():

        raise FileNotFoundError(
            f"Image not found: {image_path}"
        )

    # --------------------------------------------------------
    # Load original image
    # --------------------------------------------------------

    original_image = Image.open(
        image_path
    ).convert("RGB")

    # --------------------------------------------------------
    # Preprocess
    # --------------------------------------------------------

    image_tensor = eval_transform(
        original_image
    )

    image_tensor = image_tensor.unsqueeze(
        0
    ).to(DEVICE)

    # --------------------------------------------------------
    # Storage
    # --------------------------------------------------------

    activations = []
    gradients = []

    # --------------------------------------------------------
    # Target layer
    # --------------------------------------------------------

    target_layer = model.features[-1]

    # --------------------------------------------------------
    # Forward hook
    # --------------------------------------------------------

    def forward_hook(
        module,
        input,
        output,
    ):

        activations.append(
            output
        )

    # --------------------------------------------------------
    # Backward hook
    # --------------------------------------------------------

    def backward_hook(
        module,
        grad_input,
        grad_output,
    ):

        gradients.append(
            grad_output[0]
        )

    forward_handle = (
        target_layer.register_forward_hook(
            forward_hook
        )
    )

    backward_handle = (
        target_layer.register_full_backward_hook(
            backward_hook
        )
    )

    try:

        # ----------------------------------------------------
        # Prepare model
        # ----------------------------------------------------

        model.eval()

        model.zero_grad(
            set_to_none=True
        )

        # ----------------------------------------------------
        # Forward pass
        # ----------------------------------------------------

        logits = model(
            image_tensor
        )

        probabilities = torch.softmax(
            logits,
            dim=1
        )

        high_risk_probability = float(
            probabilities[0, 1].item()
        )

        # ----------------------------------------------------
        # Use threshold-based prediction
        # ----------------------------------------------------

        if high_risk_probability >= HIGH_RISK_THRESHOLD:

            predicted_class = 1

        else:

            predicted_class = 0

        # ----------------------------------------------------
        # Target score
        # ----------------------------------------------------

        target_score = logits[
            0,
            predicted_class,
        ]

        # ----------------------------------------------------
        # Backward pass
        # ----------------------------------------------------

        target_score.backward()

        # ----------------------------------------------------
        # Validate hooks
        # ----------------------------------------------------

        if not activations:

            raise RuntimeError(
                "Grad-CAM activation was not captured."
            )

        if not gradients:

            raise RuntimeError(
                "Grad-CAM gradient was not captured."
            )

        activation = activations[0]
        gradient = gradients[0]

        # ----------------------------------------------------
        # Validate shapes
        # ----------------------------------------------------

        if activation.ndim != 4:

            raise RuntimeError(
                "Unexpected activation shape: "
                f"{activation.shape}"
            )

        if gradient.ndim != 4:

            raise RuntimeError(
                "Unexpected gradient shape: "
                f"{gradient.shape}"
            )

        # ----------------------------------------------------
        # Global average pooling
        # ----------------------------------------------------

        weights = gradient.mean(
            dim=(2, 3),
            keepdim=True,
        )

        # ----------------------------------------------------
        # Weighted feature maps
        # ----------------------------------------------------

        cam = (
            weights * activation
        ).sum(
            dim=1,
            keepdim=True,
        )

        # ----------------------------------------------------
        # ReLU
        # ----------------------------------------------------

        cam = torch.relu(
            cam
        )

        # ----------------------------------------------------
        # Resize
        # ----------------------------------------------------

        cam = torch.nn.functional.interpolate(
            cam,
            size=(224, 224),
            mode="bilinear",
            align_corners=False,
        )

        cam = cam[
            0,
            0,
        ]

        # ----------------------------------------------------
        # NumPy
        # ----------------------------------------------------

        cam = (
            cam
            .detach()
            .cpu()
            .numpy()
        )

        # ----------------------------------------------------
        # Normalize
        # ----------------------------------------------------

        cam_min = cam.min()
        cam_max = cam.max()

        if (
            cam_max - cam_min
            > 1e-8
        ):

            cam = (
                cam - cam_min
            ) / (
                cam_max - cam_min
            )

        else:

            cam = np.zeros_like(
                cam
            )

        # ----------------------------------------------------
        # Diagnostics
        # ----------------------------------------------------

        print()
        print("Grad-CAM diagnostics")

        print(
            "CAM min:",
            float(cam_min)
        )

        print(
            "CAM max:",
            float(cam_max)
        )

        print(
            "Normalized CAM mean:",
            float(cam.mean())
        )

        print(
            "Normalized CAM std:",
            float(cam.std())
        )

        # ----------------------------------------------------
        # Convert CAM to grayscale
        # ----------------------------------------------------

        cam_uint8 = (
            cam * 255
        ).clip(
            0,
            255
        ).astype(
            np.uint8
        )

        cam_gray = Image.fromarray(
            cam_uint8,
            mode="L",
        )

        # ----------------------------------------------------
        # Create heatmap
        # ----------------------------------------------------

        heatmap_image = ImageOps.colorize(
            cam_gray,
            black=(0, 0, 120),
            mid=(255, 255, 0),
            white=(255, 0, 0),
        )

        # ----------------------------------------------------
        # Resize original
        # ----------------------------------------------------

        base_image = original_image.resize(
            (224, 224)
        )

        # ----------------------------------------------------
        # Overlay
        # ----------------------------------------------------

        overlay = Image.blend(
            base_image,
            heatmap_image,
            alpha=0.45,
        )

        # ----------------------------------------------------
        # Output directory
        # ----------------------------------------------------

        output_path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        # ----------------------------------------------------
        # Save
        # ----------------------------------------------------

        overlay.save(
            output_path
        )

        return {

            "predicted_class":
                predicted_class,

            "risk":
                CLASS_NAMES[predicted_class],

            "heatmap_path":
                str(output_path),
        }

    finally:

        # ----------------------------------------------------
        # Remove hooks
        # ----------------------------------------------------

        forward_handle.remove()
        backward_handle.remove()


# ============================================================
# DIRECT TEST
# ============================================================

if __name__ == "__main__":

    print()
    print("=" * 60)
    print("TESTING EFFICIENTNET-B0")
    print("=" * 60)

    test_image = (
        Path(__file__).resolve().parent.parent
        / "test_images"
        / "Open-pit_mine_wall_fractured_202608142345.jpeg"
    )

    output_image = (
        Path(__file__).resolve().parent.parent
        / "test_images"
        / "gradcam_test.png"
    )

    if not test_image.exists():

        print(
            "Test image not found:"
        )

        print(
            test_image
        )

    else:

        # ----------------------------------------------------
        # Prediction
        # ----------------------------------------------------

        result = predict_image(
            str(test_image)
        )

        print()
        print("Prediction")

        print(
            "Risk:",
            result["risk"]
        )

        print(
            "Confidence:",
            f"{result['confidence']:.4f}"
        )

        print(
            "Low Risk probability:",
            f"{result['low_risk_probability']:.4f}"
        )

        print(
            "High Risk probability:",
            f"{result['high_risk_probability']:.4f}"
        )

        # ----------------------------------------------------
        # Grad-CAM
        # ----------------------------------------------------

        cam_result = generate_gradcam(
            str(test_image),
            str(output_image),
        )

        print()
        print(
            "Grad-CAM generated successfully."
        )

        print(
            "Prediction class:",
            cam_result["predicted_class"]
        )

        print(
            "Risk:",
            cam_result["risk"]
        )

        print(
            "Heatmap:",
            cam_result["heatmap_path"]
        )

    print("=" * 60)