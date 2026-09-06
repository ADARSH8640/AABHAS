from datetime import datetime
from pathlib import Path
import shutil
from supabase_client import supabase

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Form,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from backend.model import (
    predict_image,
    generate_gradcam,
)

from backend.config import (
    APP_NAME,
    APP_VERSION,
    INCOMING_DIR,
    EXPLAINABILITY_DIR,
    CORS_ORIGINS,
)


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title=APP_NAME,
    description="UAV-based Rockfall Risk Detection System",
    version=APP_VERSION,
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# TEMPORARY MEMORY STORAGE
# ============================================================

latest_result = None

prediction_history = []


# ============================================================
# HOME
# PUBLIC
# ============================================================

@app.get("/")
def home():

    return {
        "message": "Rockfall AI backend is running",
        "version": APP_VERSION,
        "model": "EfficientNet-B0",
    }


# ============================================================
# HEALTH CHECK
# PUBLIC
# ============================================================

@app.get("/health")
def health_check():

    return {
        "status": "healthy",
        "service": "rockfall-ai-backend",
        "model": "EfficientNet-B0",
    }


# ============================================================
# RECEIVE DRONE IMAGE
# PUBLIC FOR LOCAL TESTING
#
# NOTE:
# Supabase authentication will be added later.
# ============================================================

@app.post("/drone/image")
async def receive_drone_image(
    file: UploadFile = File(...),
    image_source: str = Form("UAV"),
):

    global latest_result

    # --------------------------------------------------------
    # Validate file
    # --------------------------------------------------------

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No filename provided",
        )

    safe_filename = Path(file.filename).name

    # --------------------------------------------------------
    # Allowed image formats
    # --------------------------------------------------------

    allowed_extensions = {
        ".jpg",
        ".jpeg",
        ".png",
        ".webp",
    }

    extension = Path(safe_filename).suffix.lower()

    if extension not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported image format. "
                "Use JPG, JPEG, PNG, or WEBP."
            ),
        )

    # --------------------------------------------------------
    # Save incoming image
    # --------------------------------------------------------

    file_path = INCOMING_DIR / safe_filename

    try:

        with open(file_path, "wb") as buffer:

            shutil.copyfileobj(
                file.file,
                buffer,
            )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to save image: {str(e)}",
        )

    # --------------------------------------------------------
    # AI PREDICTION
    # --------------------------------------------------------

    try:

        result = predict_image(
            str(file_path)
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"AI prediction failed: {str(e)}",
        )

    # --------------------------------------------------------
    # GRAD-CAM
    # --------------------------------------------------------

    gradcam_filename = (
        f"gradcam_{file_path.stem}.png"
    )

    gradcam_path = (
        EXPLAINABILITY_DIR /
        gradcam_filename
    )

    try:

        generate_gradcam(
            str(file_path),
            str(gradcam_path),
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Grad-CAM generation failed: {str(e)}",
        )

    # --------------------------------------------------------
    # BUILD RESULT
    # --------------------------------------------------------

    prediction_result = {

        "status": "processed",

        "filename": file_path.name,

        "risk": result["risk"],

        "confidence": result["confidence"],

        "low_risk_probability": (
            result["low_risk_probability"]
        ),

        "high_risk_probability": (
            result["high_risk_probability"]
        ),

        "timestamp": (
            datetime.now().strftime(
                "%Y-%m-%d %H:%M:%S"
            )
        ),

        "uav_id": "UAV-01",

        "explainability": (
            f"/drone/explainability/"
            f"{gradcam_filename}"
        ),
    }
#--------------------------------------------------------
    # --------------------------------------------------------
    # Save prediction to Supabase
    # --------------------------------------------------------

   
       # --------------------------------------------------------
    # Save prediction to Supabase
    # --------------------------------------------------------

    try:

        supabase_response = (
            supabase
            .table("predictions")
            .insert({
                "filename": prediction_result["filename"],
                "risk": prediction_result["risk"],
                "confidence": prediction_result["confidence"],
                "low_risk_probability": prediction_result[
                    "low_risk_probability"
                ],
                "high_risk_probability": prediction_result[
                    "high_risk_probability"
                ],
                "uav_id": prediction_result["uav_id"],
                "explainability_path": prediction_result[
                    "explainability"
                ],
                "image_source": image_source,
            })
            .execute()
        )

        print("Prediction saved to Supabase")
        print(supabase_response.data)

    except Exception as e:

        print(f"Supabase insert failed: {e}")

        raise HTTPException(
            status_code=500,
            detail=f"Failed to save prediction to Supabase: {str(e)}",
        )

    # --------------------------------------------------------
    # Store latest result
    # --------------------------------------------------------

    latest_result = prediction_result

    # --------------------------------------------------------
    # Store history
    # --------------------------------------------------------

    prediction_history.insert(
        0,
        prediction_result,
    )

    # Keep only latest 20 predictions

    if len(prediction_history) > 20:
        prediction_history.pop()

    # --------------------------------------------------------
    # Return result
    # --------------------------------------------------------

    return prediction_result

# ============================================================
# GET LATEST RESULT
# PUBLIC FOR LOCAL TESTING
# ============================================================

@app.get("/drone/latest")
def get_latest_result():

    if latest_result is None:

        return {
            "status": "waiting",
            "message": (
                "No drone image has been "
                "processed yet."
            ),
        }

    return latest_result


# ============================================================
# GET DRONE IMAGE
# PUBLIC FOR LOCAL TESTING
# ============================================================

@app.get("/drone/image/{filename}")
def get_drone_image(
    filename: str,
):

    safe_filename = Path(filename).name

    file_path = (
        INCOMING_DIR /
        safe_filename
    )

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail="Image not found",
        )

    return FileResponse(
        file_path
    )


# ============================================================
# GET GRAD-CAM IMAGE
# PUBLIC FOR LOCAL TESTING
# ============================================================

@app.get("/drone/explainability/{filename}")
def get_explainability_image(
    filename: str,
):

    safe_filename = Path(filename).name

    file_path = (
        EXPLAINABILITY_DIR /
        safe_filename
    )

    if not file_path.exists():

        raise HTTPException(
            status_code=404,
            detail="Explainability image not found",
        )

    return FileResponse(
        file_path
    )


# ============================================================
# GET PREDICTION HISTORY
# PUBLIC FOR LOCAL TESTING
# ============================================================

@app.get("/drone/history")
def get_prediction_history():

    return {
        "count": len(prediction_history),
        "history": prediction_history,
    }