# Installation Scripts

Script untuk instalasi dependencies dan setup environment.

## 📁 File

### `install_and_test_ocr.bat`
Batch script untuk Windows untuk menginstal dan test OCR dependencies.

**Usage:**
```cmd
install_and_test_ocr.bat
```

### `install_ocr.py`
Python script untuk menginstal dependencies OCR (DET-03).

**Usage:**
```bash
python install_ocr.py
```

### `INSTALL_TESSERACT.md`
Petunjuk instalasi Tesseract OCR manual untuk Windows.

## 🔧 Instalasi Lengkap

### 1. Install Dependencies Python
```bash
# Dari root project
pip install -r requirements.txt

# Atau menggunakan script
cd tests
python install_deps.py
```

### 2. Install OCR (Untuk DET-03)
```bash
# Manual steps di INSTALL_TESSERACT.md
# Atau gunakan batch script
scripts\install_and_test_ocr.bat
```

### 3. Verify Installation
```bash
cd tests
python check_imports.py
python check_ocr_deps.py
```

## 🚨 Troubleshooting

### OCR Installation Issues
1. **Tesseract not found in PATH**
   - Download manual dari https://github.com/UB-Mannheim/tesseract/wiki
   - Pastikan opsi "Add to PATH" dicentang
   - Restart terminal/computer

2. **pytesseract import error**
   ```python
   # Set manual path di code
   import pytesseract
   pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
   ```

### Virtual Environment
```bash
# Aktifkan virtual environment
.venv\Scripts\activate

# Deactivate
deactivate
```

---
**Note:** Script ini untuk development environment Windows.