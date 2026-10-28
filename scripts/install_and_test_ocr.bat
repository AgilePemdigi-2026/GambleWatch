@echo off
echo ========================================
echo 📦 Installing OCR Dependencies for DET-03
echo ========================================
echo.

echo Step 1: Install Python packages...
pip install pytesseract pillow opencv-python numpy regex

echo.
echo Step 2: Download Tesseract OCR for Windows
echo.
echo Please download Tesseract from:
echo https://github.com/UB-Mannheim/tesseract/wiki
echo.
echo Download: tesseract-ocr-w64-setup-5.4.0.20241005.exe
echo.
echo IMPORTANT: Check "Add to PATH" during installation!
echo.

echo Step 3: Test installation...
python -c "import pytesseract; print('✅ pytesseract installed')"
python -c "from PIL import Image; print('✅ PIL installed')"
python -c "import cv2; print('✅ OpenCV installed')"
python -c "import numpy; print('✅ numpy installed')"

echo.
echo Step 4: Test OCR detection...
python test_all_detectors.py

echo.
echo ========================================
echo 🎯 Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Install Tesseract from the link above
echo 2. Add Tesseract to PATH: C:\Program Files\Tesseract-OCR\
echo 3. Test with: python check_ocr_deps.py
echo.
pause