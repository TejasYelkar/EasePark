
# SmartPark ANPR Module

## Project Description
This module detects vehicle number plates using YOLO and extracts the plate number using Tesseract OCR.

## Technologies Used
- Python
- YOLO (Ultralytics)
- OpenCV
- Tesseract OCR
- FastAPI

## Installation

Install Python dependencies:

pip install -r requirements.txt

Install Tesseract OCR separately on Windows.

## Run the API

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

## API Details

- Method: POST
- Endpoint: /anpr/recognize
- Content-Type: multipart/form-data
- Image field: file

## API Testing

Open this URL in your browser:

http://127.0.0.1:8000/docs

Upload a vehicle image using POST /anpr/recognize.

## EasyPark app integration

Start the ANPR API from this directory:

python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

The mobile app derives the ANPR URL from `EXPO_PUBLIC_API_URL` by replacing
the backend port with `8000`. For a different host or port, set
`EXPO_PUBLIC_ANPR_API_URL` in the app's `.env.local` file.

## Model File
best.pt is the YOLO license plate detection model.
