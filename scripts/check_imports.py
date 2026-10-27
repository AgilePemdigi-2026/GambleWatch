#!/usr/bin/env python3
"""Check jika semua dependencies Python terinstal"""

import sys

print(f"Python version: {sys.version}")
print("\nTesting basic imports...")

# Cek dependencies
deps = {
    "pydantic": "pydantic",
    "rapidfuzz": "rapidfuzz", 
    "numpy": "numpy",
    "regex": "regex",
    "pillow": "PIL",
    "tensorflow (optional)": "tensorflow",
    "torch (optional)": "torch",
    "cv2 (optional)": "cv2",
    "pytesseract (optional)": "pytesseract"
}

all_ok = True
for name, import_path in deps.items():
    try:
        if '.' in import_path:
            # Handle dari import (like PIL.Image)
            parts = import_path.split('.')
            module = __import__(parts[0])
            for part in parts[1:]:
                module = getattr(module, part)
            print(f"✓ {name}: OK")
        else:
            __import__(import_path)
            print(f"✓ {name}: OK")
    except ImportError:
        if "optional" in name:
            print(f"⚠️ {name}: Missing (optional)")
        else:
            print(f"✗ {name}: Missing (required)")
            all_ok = False

print("\n" + "=" * 50)
print("Testing detection engine imports...")

# Cek detection engine
try:
    from detection_engine.models.detection_models import DetectionResult
    print("✓ detection_models: OK")
except ImportError as e:
    print(f"✗ detection_models: {e}")
    all_ok = False

try:
    from detection_engine.config.detection_config import DetectionConfig
    print("✓ detection_config: OK")
except ImportError as e:
    print(f"✗ detection_config: {e}")
    all_ok = False

try:
    from detection_engine.detectors.url_pattern.url_pattern_detector import URLPatternDetector
    print("✓ URLPatternDetector: OK")
except ImportError as e:
    print(f"✗ URLPatternDetector: {e}")
    all_ok = False

try:
    from detection_engine.detectors.text_keyword.text_keyword_detector import TextKeywordDetector
    print("✓ TextKeywordDetector: OK")
except ImportError as e:
    print(f"✗ TextKeywordDetector: {e}")
    all_ok = False

print("\n" + "=" * 50)
if all_ok:
    print("✅ Semua dependencies utama terinstal!")
    print("🎯 Detection engine DET-01 dan DET-04 siap digunakan.")
    print("\n📝 Untuk DET-03 (OCR), instal:")
    print("   1. Tesseract OCR dari https://github.com/UB-Mannheim/tesseract/wiki")
    print("   2. pip install pytesseract opencv-python")
else:
    print("⚠️  Beberapa dependencies masih belum terinstal.")
    print("📝 Jalankan: pip install pydantic rapidfuzz numpy regex pillow")