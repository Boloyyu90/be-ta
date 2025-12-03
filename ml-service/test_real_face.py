# test_real_face.py - Save in ml-service directory

import base64
import requests
import json
from PIL import Image
from io import BytesIO
import sys

def capture_webcam_photo():
    """Capture a photo from webcam"""
    print("📸 Opening webcam to capture photo...")
    print("⚠️  This requires opencv-python. Installing if needed...")

    try:
        import cv2
    except ImportError:
        print("Installing opencv-python...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "opencv-python", "--break-system-packages"])
        import cv2

    # Open webcam
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("❌ Cannot open webcam")
        return None

    print("\n✅ Webcam opened!")
    print("📷 Position your face in front of the camera")
    print("🎬 Press SPACE to capture, ESC to cancel\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("❌ Cannot read frame")
            break

        # Show preview
        cv2.imshow('Webcam - Press SPACE to capture, ESC to cancel', frame)

        key = cv2.waitKey(1)
        if key == 27:  # ESC
            print("❌ Cancelled")
            cap.release()
            cv2.destroyAllWindows()
            return None
        elif key == 32:  # SPACE
            print("✅ Photo captured!")
            cap.release()
            cv2.destroyAllWindows()

            # Convert BGR to RGB
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            image = Image.fromarray(frame_rgb)

            # Save capture
            image.save("captured_face.jpg")
            print("💾 Saved as: captured_face.jpg\n")

            return image

    cap.release()
    cv2.destroyAllWindows()
    return None

def load_image_from_file(image_path):
    """Load image from file"""
    try:
        image = Image.open(image_path)
        print(f"✅ Loaded image: {image_path}")
        print(f"   Size: {image.size[0]}x{image.size[1]} pixels\n")
        return image
    except Exception as e:
        print(f"❌ Error loading image: {e}")
        return None

def analyze_face(image):
    """Send image to ML service for analysis"""
    print("🔍 Analyzing face with YOLO service...")

    # Convert to base64
    buffer = BytesIO()
    image.save(buffer, format='JPEG', quality=95)
    img_base64 = base64.b64encode(buffer.getvalue()).decode()

    # Send to service
    try:
        response = requests.post(
            "http://localhost:8000/analyze",
            json={"image": img_base64},
            timeout=10
        )

        if response.status_code != 200:
            print(f"❌ Service error: {response.status_code}")
            return None

        return response.json()

    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to ML service. Is it running on port 8000?")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def display_results(result):
    """Display analysis results in a nice format"""
    print("\n" + "="*60)
    print("📊 YOLO FACE DETECTION RESULTS")
    print("="*60)

    if not result['success']:
        print(f"❌ Analysis failed: {result.get('error', 'Unknown error')}")
        return

    face_count = result['face_count']
    confidence = result['confidence']
    looking_away = result['looking_away']
    processing_time = result['processing_time_ms']

    # Face Count Status
    print(f"\n👥 FACE COUNT: {face_count}")
    if face_count == 0:
        print("   Status: ⚠️  NO FACE DETECTED")
        print("   Violation: HIGH SEVERITY")
    elif face_count == 1:
        print("   Status: ✅ SINGLE FACE (Normal)")
    else:
        print(f"   Status: ⚠️  MULTIPLE FACES DETECTED")
        print("   Violation: HIGH SEVERITY")

    # Confidence
    print(f"\n🎯 CONFIDENCE: {confidence:.2%}")
    if confidence > 0.8:
        print("   Quality: ✅ Excellent")
    elif confidence > 0.5:
        print("   Quality: ⚠️  Good")
    else:
        print("   Quality: ❌ Poor")

    # Head Pose
    print(f"\n👀 LOOKING AWAY: {'⚠️  YES' if looking_away else '✅ NO'}")
    if looking_away:
        print("   Violation: MEDIUM SEVERITY")
    else:
        print("   Status: Normal")

    # Processing Time
    print(f"\n⚡ PROCESSING TIME: {processing_time:.1f}ms")
    if processing_time < 300:
        print("   Performance: ✅ Fast")
    elif processing_time < 1000:
        print("   Performance: ⚠️  Acceptable")
    else:
        print("   Performance: ❌ Slow")

    # Proctoring Verdict
    print("\n" + "-"*60)
    print("🎓 PROCTORING VERDICT:")
    print("-"*60)

    violations = []
    if face_count == 0:
        violations.append("NO_FACE_DETECTED (HIGH)")
    elif face_count > 1:
        violations.append("MULTIPLE_FACES (HIGH)")

    if face_count == 1 and looking_away:
        violations.append("LOOKING_AWAY (MEDIUM)")

    if violations:
        print("❌ VIOLATIONS DETECTED:")
        for v in violations:
            print(f"   • {v}")
    else:
        print("✅ NO VIOLATIONS - Student is properly monitored")

    print("="*60 + "\n")

    # Save results
    with open("analysis_result.json", "w") as f:
        json.dump(result, f, indent=2)
    print("💾 Full results saved to: analysis_result.json\n")

def main():
    print("="*60)
    print("🎯 YOLO FACE DETECTION TEST - Real Image Analysis")
    print("="*60)
    print("\nChoose input method:")
    print("1. Capture from webcam")
    print("2. Load from file")
    print("3. Use demo image (if you have one)")

    choice = input("\nEnter choice (1/2/3): ").strip()

    image = None

    if choice == "1":
        image = capture_webcam_photo()
    elif choice == "2":
        image_path = input("Enter image path: ").strip().strip('"').strip("'")
        image = load_image_from_file(image_path)
    elif choice == "3":
        # Try common demo image names
        for demo_path in ["test_face.jpg", "face.jpg", "photo.jpg", "captured_face.jpg"]:
            image = load_image_from_file(demo_path)
            if image:
                break
        if not image:
            print("❌ No demo image found. Please capture or specify a file.")
            return
    else:
        print("❌ Invalid choice")
        return

    if image is None:
        print("❌ No image loaded. Exiting.")
        return

    # Analyze
    result = analyze_face(image)

    if result:
        display_results(result)
    else:
        print("❌ Analysis failed")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Test cancelled by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")