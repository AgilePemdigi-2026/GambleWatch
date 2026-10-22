# GambleWatch Detection Engine - Test Suite

## 📁 Struktur Testing

```
tests/
├── README.md                    # Dokumentasi ini
├── test_all_detectors.py       # Test komprehensif DET-01 sampai DET-04
├── test_final.py               # Test akhir sebelum deployment
├── test_simple.py              # Test sederhana DET-01 & DET-04
├── test_isolated.py            # Test isolasi masing-masing detector
├── test_detection.py           # Test detection pipeline
├── simple_test.py              # Test paling sederhana
├── check_imports.py            # Cek dependencies terinstal
├── check_ocr_deps.py           # Cek dependencies OCR
├── install_deps.py             # Script instalasi dependencies
└── quick_test.py               # Test cepat
```

## 🚀 Cara Menjalankan Test

### 1. Test Dasar (DET-01 + DET-04)
```bash
cd tests
python test_simple.py
```

### 2. Test Semua Detectors
```bash
python test_all_detectors.py
```

### 3. Test Komprehensif
```bash
python test_final.py
```

### 4. Test Cepat
```bash
python quick_test.py
```

## 🔧 Dependencies Checking

### Cek dependencies yang terinstal:
```bash
python check_imports.py
```

### Cek dependencies OCR (DET-03):
```bash
python check_ocr_deps.py
```

### Instal dependencies:
```bash
python install_deps.py
```

## 📊 Test Coverage

| Test File | Purpose | Dependencies | Time |
|-----------|---------|--------------|------|
| `test_simple.py` | Basic functionality | DET-01, DET-04 | < 2s |
| `test_all_detectors.py` | All detectors | All | < 10s |
| `test_final.py` | Pre-deployment | All | < 15s |
| `test_isolated.py` | Isolation testing | Per detector | < 5s |

## 🎯 Test Scenarios

### DET-01: URL Pattern Detection
- ✅ URL gambling (slot, togel, judi, sbobet)
- ✅ URL normal (google, tokopedia, shopee)
- ✅ Edge cases (subdomains, paths, parameters)

### DET-04: Text/Keyword Detection
- ✅ Text dengan kata kunci gambling
- ✅ Text normal tanpa kata kunci
- ✅ Text campuran bahasa
- ✅ Text dengan typo/slang

### DET-03: OCR Detection (Jika terinstal)
- ✅ Gambar dengan text jelas
- ✅ Gambar dengan background kompleks
- ✅ Multiple languages

### DET-02: Visual Similarity (Future)
- ✅ Screenshot comparison
- ✅ Logo matching
- ✅ Layout similarity

## 🐛 Troubleshooting

### Import Error
```python
# Jika error: ModuleNotFoundError
# Pastikan working directory benar:
import sys
sys.path.append('..')  # Untuk import dari root
```

### Dependencies Missing
```bash
# Install semua dependencies
pip install -r ../requirements.txt

# Atau install satu per satu
pip install pydantic rapidfuzz numpy regex pillow
```

### OCR Not Working
1. Download Tesseract OCR: https://github.com/UB-Mannheim/tesseract/wiki
2. Add to PATH
3. Install Python packages:
   ```bash
   pip install pytesseract opencv-python
   ```

## 📈 Performance Metrics

Target performance:
- DET-01: < 50ms per URL
- DET-04: < 100ms per text
- DET-03: < 500ms per image (dengan OCR)
- Full pipeline: < 1s per site

## 🔄 Continuous Testing

Untuk integrasi dengan CI/CD:
```bash
# Run all tests
python -m pytest tests/ -v

# Run with coverage
coverage run -m pytest tests/
coverage report
```

## 📝 Catatan

- Test `test_final.py` harus selalu PASS sebelum deployment
- File `test_isolated.py` berguna untuk debugging detector spesifik
- Gunakan `check_imports.py` sebelum menjalankan test suite

---
**Last Updated:** October 21, 2026  
**Branch:** `feature/detection-engine`