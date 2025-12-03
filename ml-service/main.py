"""
YOLO Face Detection Microservice
================================

FastAPI service for face detection using YOLOv8 model.
Designed to be called from Node.js backend for proctoring system.

Author: Bala (Thesis Project)
Model: YOLOv8n (auto-download from Ultralytics)
"""

# ==================== PYTORCH COMPATIBILITY FIX ====================
# ✅ CRITICAL: Set environment variable BEFORE any imports
# This disables PyTorch 2.6+ weights_only restriction
import os
os.environ['TORCH_SERIALIZATION_WEIGHTS_ONLY'] = '0'

import base64
import time
import logging
from io import BytesIO
from typing import Optional
from contextlib import asynccontextmanager

import numpy as np
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from ultralytics import YOLO

# ==================== LOGGING ====================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== CONFIGURATION ====================

MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "yolov8n-face.pt")
CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.5"))
MAX_IMAGE_SIZE = int(os.getenv("MAX_IMAGE_SIZE", "1280"))

# ==================== GLOBAL STATE ====================

yolo_model: Optional[YOLO] = None

# ==================== LIFESPAN EVENT HANDLER ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup/shutdown"""
    global yolo_model

    # STARTUP
    logger.info(f"🔥 Loading YOLO model from: {MODEL_PATH}")

    try:
        # ✅ Load model (Ultralytics will auto-download if needed)
        yolo_model = YOLO(MODEL_PATH)

        # Warmup with dummy inference
        logger.info("⏳ Warming up model...")
        dummy_image = np.zeros((640, 640, 3), dtype=np.uint8)
        yolo_model(dummy_image, verbose=False)

        logger.info("✅ YOLO model loaded and warmed up")

    except Exception as e:
        logger.error(f"❌ Failed to load model: {e}")
        logger.info("⚠️ Service will run without model (for testing)")

    yield  # App is running

    # SHUTDOWN
    logger.info("👋 Shutting down...")

# ==================== APPLICATION ====================

app = FastAPI(
    title="YOLO Face Detection Service",
    description="Microservice for exam proctoring face detection",
    version="1.0.0",
    lifespan=lifespan  # ✅ Use lifespan handler
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== MODELS ====================

class AnalyzeRequest(BaseModel):
    """Request model for face analysis"""
    image: str = Field(..., description="Base64 encoded image")

class AnalyzeResponse(BaseModel):
    """Response model for face analysis"""
    success: bool
    face_count: int
    confidence: float
    looking_away: bool
    processing_time_ms: float
    bounding_boxes: Optional[list] = None
    error: Optional[str] = None

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    model_loaded: bool
    model_path: str
    model_type: str
    confidence_threshold: float

# ==================== HELPER FUNCTIONS ====================

def decode_base64_image(base64_string: str) -> Image.Image:
    """
    Decode base64 string to PIL Image
    Handles both with and without data URL prefix
    """
    # Remove data URL prefix if present
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]

    try:
        image_data = base64.b64decode(base64_string)
        image = Image.open(BytesIO(image_data))

        # Convert to RGB if necessary
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Resize if too large
        if max(image.size) > MAX_IMAGE_SIZE:
            ratio = MAX_IMAGE_SIZE / max(image.size)
            new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
            image = image.resize(new_size, Image.Resampling.LANCZOS)

        return image
    except Exception as e:
        logger.error(f"Failed to decode image: {e}")
        raise ValueError(f"Invalid image data: {str(e)}")

def estimate_looking_away(boxes: list, image_width: int) -> bool:
    """
    Estimate if person is looking away based on face position

    Heuristic: If face bounding box center is significantly off-center,
    person might be looking away. More sophisticated: use head pose estimation.

    For MVP, we use simple center-based heuristic.
    """
    if not boxes or len(boxes) == 0:
        return False

    # Get the most confident detection
    main_box = boxes[0]
    x1, y1, x2, y2 = main_box[:4]

    # Calculate face center
    face_center_x = (x1 + x2) / 2

    # Calculate deviation from image center
    image_center_x = image_width / 2
    deviation_ratio = abs(face_center_x - image_center_x) / image_center_x

    # If face center is more than 40% off from image center
    # consider it as potentially looking away
    return deviation_ratio > 0.4

# ==================== ENDPOINTS ====================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if yolo_model else "degraded",
        model_loaded=yolo_model is not None,
        model_path=MODEL_PATH,
        model_type="yolov8-face",
        confidence_threshold=CONFIDENCE_THRESHOLD
    )

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_face(request: AnalyzeRequest):
    """
    Analyze face in image

    Returns:
    - face_count: Number of faces detected
    - confidence: Confidence score of primary detection
    - looking_away: Boolean indicating if person appears to be looking away
    """
    start_time = time.time()

    # Check model availability
    if yolo_model is None:
        # Return mock response if model not loaded (development mode)
        logger.warning("⚠️ Model not loaded, returning mock response")
        return AnalyzeResponse(
            success=True,
            face_count=1,
            confidence=0.95,
            looking_away=False,
            processing_time_ms=(time.time() - start_time) * 1000,
            error="Model not loaded - mock response"
        )

    try:
        # Decode image
        image = decode_base64_image(request.image)
        image_np = np.array(image)

        # Run YOLO inference
        results = yolo_model(
            image_np,
            conf=CONFIDENCE_THRESHOLD,
            verbose=False
        )

        # Extract detections (class 0 = person in COCO dataset)
        boxes = []
        confidences = []

        for result in results:
            if result.boxes is not None:
                for box in result.boxes:
                    # Filter for person class (class_id = 0)
                    if int(box.cls[0]) == 0:  # ✅ Only count "person" detections
                        boxes.append(box.xyxy[0].tolist())
                        confidences.append(float(box.conf[0]))

        # Calculate metrics
        face_count = len(boxes)
        confidence = max(confidences) if confidences else 0.0
        looking_away = estimate_looking_away(boxes, image.width) if face_count == 1 else False

        processing_time_ms = (time.time() - start_time) * 1000

        logger.info(
            f"✅ Analysis complete: {face_count} faces, "
            f"conf={confidence:.2f}, "
            f"looking_away={looking_away}, "
            f"time={processing_time_ms:.1f}ms"
        )

        return AnalyzeResponse(
            success=True,
            face_count=face_count,
            confidence=confidence,
            looking_away=looking_away,
            processing_time_ms=processing_time_ms,
            bounding_boxes=boxes
        )

    except ValueError as e:
        logger.error(f"❌ Invalid image: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "YOLO Face Detection",
        "version": "1.0.0",
        "model": "YOLOv8n (standard)",
        "endpoints": {
            "health": "GET /health",
            "analyze": "POST /analyze"
        }
    }

# ==================== MAIN ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )