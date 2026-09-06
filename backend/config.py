from pathlib import Path
import os
from dotenv import load_dotenv

# ============================================================
# LOAD ENVIRONMENT VARIABLES
# ============================================================

load_dotenv()

# ============================================================
# PROJECT PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = (
    BASE_DIR
    / "models"
    / "efficientnet_b0_best_v2.pth"
)

INCOMING_DIR = (
    BASE_DIR
    / "drone_ingestion"
    / "incoming"
)

EXPLAINABILITY_DIR = (
    BASE_DIR
    / "drone_ingestion"
    / "explainability"
)

# Create directories
INCOMING_DIR.mkdir(
    parents=True,
    exist_ok=True
)

EXPLAINABILITY_DIR.mkdir(
    parents=True,
    exist_ok=True
)

# ============================================================
# APPLICATION SETTINGS
# ============================================================

APP_NAME = "Rockfall AI"
APP_VERSION = "1.0.0"

# ============================================================
# AUTH SETTINGS
# ============================================================

ADMIN_USERNAME = os.getenv(
    "ADMIN_USERNAME",
    "admin@rockfall.ai"
)

ADMIN_PASSWORD = os.getenv(
    "ADMIN_PASSWORD",
    "Rockfall@12345"
)

# ============================================================
# CORS
# ============================================================

CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
]