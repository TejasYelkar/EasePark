
import cv2
import pytesseract
import re
import numpy as np

from ultralytics import YOLO
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

# Tesseract location
pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)

# Load YOLO model once
model = YOLO("best.pt")

app = FastAPI(title="SmartPark ANPR API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "SmartPark ANPR API is running"}


@app.post("/anpr/recognize")
async def recognize_plate(file: UploadFile = File(...)):

    # Step 1: Read uploaded image
    contents = await file.read()
    image_array = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        return {
            "success": False,
            "message": "Invalid image"
        }

    # Step 2: Detect number plate
    results = model(image)
    boxes = results[0].boxes

    if len(boxes) == 0:
        return {
            "success": False,
            "plateNumber": None,
            "message": "No number plate detected"
        }

    # Step 3: Select highest confidence detection
    best_index = int(boxes.conf.argmax())
    box = boxes[best_index]

    x1, y1, x2, y2 = map(
        int, box.xyxy[0].tolist()
    )

    # Step 4: Crop number plate
    plate_image = image[y1:y2, x1:x2]

    if plate_image.size == 0:
        return {
            "success": False,
            "plateNumber": None,
            "message": "Could not crop number plate"
        }

    # Step 5: Grayscale and resize
    gray = cv2.cvtColor(
        plate_image, cv2.COLOR_BGR2GRAY
    )

    gray = cv2.resize(
        gray, None, fx=3, fy=3
    )

    # Step 6: OCR
    config = (
        "--psm 7 "
        "-c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    )

    text = pytesseract.image_to_string(
        gray, config=config
    )

    # Step 7: Clean result
    plate_number = re.sub(
        r"[^A-Z0-9]", "", text.upper()
    )

    if not plate_number:
        return {
            "success": False,
            "plateNumber": None,
            "detectionConfidence": round(
                float(box.conf[0]) * 100, 2
            ),
            "message": "Plate detected but text not readable"
        }

    return {
        "success": True,
        "plateNumber": plate_number,
        "detectionConfidence": round(
            float(box.conf[0]) * 100, 2
        ),
        "message": "Number plate recognized"
    }
