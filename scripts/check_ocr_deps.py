#!/usr/bin/env python3
"""Check OCR dependencies installation."""

import sys
import importlib

print("🔍 Checking OCR Dependencies for DET-03")
print("=" * 60)

dependencies = [
    ("pytesseract", "OCR engine wrapper"),
    ("PIL", "Image processing (Pillow)"),
    ("cv2", "OpenCV for image processing"),
]

all_ok = True

for module_name, description in dependencies:
    try:
        if module_name == "PIL":
            module = importlib.import_module("PIL.Image")
            version = module.__version__
        elif module_name == "cv2":
            module = importlib.import_module("cv2")
            version = module.__version__
        else:
            module = importlib.import_module(module_name)
            version = getattr(module, "__version__", "unknown")
        
        print(f"✅ {module_name:<15} {description:<30} Version: {version}")
        
    except ImportError as e:
        print(f"❌ {module_name:<15} {description:<30} NOT INSTALLED")
        print(f"   Install: pip install {module_name if module_name != 'PIL' else 'pillow'}")
        all_ok = False

print("\n" + "=" * 60)
print("🔧 Checking Tesseract Installation")
print("-" * 60)

try:
    import pytesseract
    
    # Coba beberapa lokasi umum Tesseract di Windows
    possible_paths = [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        r"C:\Users\{}\AppData\Local\Tesseract-OCR\tesseract.exe".format(
            importlib.import_module("getpass").getuser()
        ),
    ]
    
    import shutil
    tesseract_path = shutil.which("tesseract")
    
    if tesseract_path:
        print(f"✅ Tesseract found in PATH: {tesseract_path}")
        pytesseract.pytesseract.tesseract_cmd = tesseract_path
    else:
        print("⚠️  Tesseract not found in PATH")
        
        found = False
        for path in possible_paths:
            import os
            if os.path.exists(path):
                print(f"✅ Tesseract found at: {path}")
                pytesseract.pytesseract.tesseract_cmd = path
                found = True
                break
        
        if not found:
            print("❌ Tesseract not found. Please install from:")
            print("   https://github.com/UB-Mannheim/tesseract/wiki")
    
    # Test Tesseract version
    try:
        import subprocess
        result = subprocess.run(
            [pytesseract.pytesseract.tesseract_cmd, "--version"],
            capture_output=True,
            text=True
        )
        print(f"✅ Tesseract version: {result.stdout.split()[1]}")
    except:
        print("⚠️  Could not get Tesseract version")
        
except Exception as e:
    print(f"❌ Tesseract check failed: {e}")

print("\n" + "=" * 60)
print("🧪 Testing OCR Detection")
print("-" * 60)

if all_ok:
    try:
        from detection_engine.detectors.ocr.ocr_detector import OCRDetector
        
        detector = OCRDetector()
        print("✅ OCRDetector initialized successfully")
        
        # Check if detector is properly configured
        if detector.ocr_detector:
            print("✅ OCR detector ready for use")
        else:
            print("⚠️  OCR detector not available (check Tesseract installation)")
        
        print("\n📝 To test with an image:")
        print("   1. Create a test image with text")
        print("   2. Run: detector.detect_from_file('test_image.jpg')")
        print("   3. Or: python -m detection_engine.detectors.ocr.ocr_detector")
        
    except Exception as e:
        print(f"❌ OCR detector initialization failed: {e}")
        print("\n🔧 Common fixes:")
        print("   1. Install Tesseract from: https://github.com/UB-Mannheim/tesseract/wiki")
        print("   2. Add Tesseract to PATH or set tesseract_cmd manually")
        print("   3. Restart your terminal/IDE after installation")
else:
    print("❌ Cannot test OCR - missing dependencies")

print("\n" + "=" * 60)
print("🚀 Installation Summary")
print("-" * 60)

if all_ok:
    print("✅ All Python dependencies installed")
    print("🔧 Tesseract: " + ("✅ Found" if 'tesseract_path' in locals() and tesseract_path else "❌ Not found"))
    print("\n🎯 Ready for OCR testing!")
else:
    print("❌ Missing dependencies")
    print("\n📦 Install missing packages:")
    print("   pip install pytesseract pillow opencv-python")
    print("\n🔧 Then install Tesseract OCR:")
    print("   Download from: https://github.com/UB-Mannheim/tesseract/wiki")

print("\n💡 Quick test after installation:")
print("   python -c \"import pytesseract; print('✅ Tesseract:', pytesseract.get_tesseract_version())\"")