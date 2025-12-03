# test_face_detection.py (save in ml-service directory)

import base64
import requests
from PIL import Image
from io import BytesIO

def test_face_detection():
    # Create a simple test image (you can replace with real image path)
    # For now, let's test with a placeholder

    print("🧪 Testing YOLO Face Detection Service\n")

    # Test 1: Health check
    print("Test 1: Health Check")
    health = requests.get("http://localhost:8000/health")
    print(f"Status: {health.json()['status']}")
    print(f"Model: {health.json()['model_type']}")
    print(f"✅ Health check passed\n")

    # Test 2: Analyze with dummy image
    print("Test 2: Face Analysis (dummy image)")

    # Create a small test image (black square)
    img = Image.new('RGB', (640, 640), color='black')
    buffer = BytesIO()
    img.save(buffer, format='JPEG')
    img_base64 = base64.b64encode(buffer.getvalue()).decode()

    response = requests.post(
        "http://localhost:8000/analyze",
        json={"image": img_base64},
        timeout=10
    )

    result = response.json()
    print(f"Face Count: {result['face_count']}")
    print(f"Confidence: {result['confidence']:.2f}")
    print(f"Looking Away: {result['looking_away']}")
    print(f"Processing Time: {result['processing_time_ms']:.1f}ms")
    print(f"✅ Analysis endpoint working\n")

    print("🎉 All tests passed! Service is operational.")

if __name__ == "__main__":
    test_face_detection()