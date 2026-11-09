# 📦 Install Tesseract OCR untuk DET-03

## **Windows Installation:**

### **1. Download Tesseract Installer**
- **Link**: https://github.com/UB-Mannheim/tesseract/wiki
- **Pilih**: `tesseract-ocr-w64-setup-5.4.0.20241005.exe` (versi terbaru)
- **Atau gunakan chocolatey** (jika sudah install):
  ```powershell
  choco install tesseract
  ```

### **2. Run Installer**
- Jalankan installer yang sudah didownload
- **PENTING**: Centang **"Add to PATH"** selama instalasi
- Pilih folder instalasi default: `C:\Program Files\Tesseract-OCR\`

### **3. Verify Installation**
Buka PowerShell:
```powershell
tesseract --version
```
Seharusnya muncul versi Tesseract.

### **4. Download Bahasa Indonesia**
- Download `ind.traineddata` dari: https://github.com/tesseract-ocr/tessdata
- Letakkan di: `C:\Program Files\Tesseract-OCR\tessdata\`

### **5. Test dengan Python**
```python
import pytesseract
from PIL import Image
import cv2

print("✅ pytesseract:", pytesseract.__version__)
print("✅ PIL:", Image.__version__)
print("✅ OpenCV:", cv2.__version__)

# Test Tesseract path
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
print("✅ Tesseract path configured")
```

## **Alternative: Docker (jika ada Docker)**
```bash
docker run -it --rm -v ${PWD}:/work tesseractshadow/tesseract5-ocr tesseract --version
```

## **Test OCR Detection**
Setelah install, test DET-03:
```bash
python test_all_detectors.py
```

## **Troubleshooting:**

### **"Tesseract not found"**
```python
# Tambah di Python code:
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
# Atau
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe'
```

### **"No module named 'cv2'"**
```bash
pip install opencv-python-headless  # lebih ringan
```

### **"PIL not found"**
```bash
pip install pillow
```

## **Quick Install Script:**
Buat file `install_ocr.bat`:
```batch
@echo off
echo Installing OCR dependencies...
pip install pytesseract pillow opencv-python
echo.
echo Download Tesseract from:
echo https://github.com/UB-Mannheim/tesseract/wiki
echo.
echo After installing Tesseract, add to PATH:
echo C:\Program Files\Tesseract-OCR\
pause
```

## **Verify Complete Installation:**
```bash
python -c "
try:
    import pytesseract
    from PIL import Image
    import cv2
    print('✅ All OCR dependencies installed')
    
    # Test Tesseract
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    print('✅ Tesseract configured')
    
except Exception as e:
    print(f'❌ Error: {e}')
"
```