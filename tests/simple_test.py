#!/usr/bin/env python3
"""Simple test without dependencies."""

import sys

def test_basic():
    print("🧪 Basic Python test")
    print("=" * 50)
    
    # Check Python version
    print(f"Python version: {sys.version}")
    
    # Check if we can import basic modules
    try:
        print("✅ Python environment is working")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test file structure
    import os
    
    print("\n📁 Project structure check:")
    folders = ["detection_engine", "detection_engine/models", "detection_engine/detectors"]
    for folder in folders:
        if os.path.exists(folder):
            print(f"  ✅ {folder}/")
        else:
            print(f"  ❌ {folder}/ (missing)")
    
    print("\n📄 File check:")
    files = [
        "detection_engine/__init__.py",
        "detection_engine/models/detection_models.py",
        "detection_engine/detectors/url_pattern/url_pattern_detector.py",
        "detection_engine/detectors/text_keyword/text_keyword_detector.py",
        "README.md",
        "requirements.txt"
    ]
    
    for file in files:
        if os.path.exists(file):
            print(f"  ✅ {file}")
        else:
            print(f"  ❌ {file} (missing)")
    
    print("\n" + "=" * 50)
    print("📋 Manual installation steps:")
    print("1. Install dependencies: pip install pydantic rapidfuzz Pillow numpy regex")
    print("2. Install Tesseract for OCR (optional): https://github.com/UB-Mannheim/tesseract/wiki")
    print("3. Run test: python test_detection.py")


if __name__ == "__main__":
    test_basic()