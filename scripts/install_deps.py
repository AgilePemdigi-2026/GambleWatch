#!/usr/bin/env python3
"""Script untuk menginstal dependencies Python"""

import subprocess
import sys

# Daftar dependencies yang diperlukan
dependencies = [
    "pydantic",
    "rapidfuzz",
    "numpy",
    "regex",
    "pillow",
    # OCR dependencies akan diinstal nanti setelah Tesseract terinstal
]

print("Menginstal dependencies Python...")
print(f"Dependencies: {', '.join(dependencies)}")

for dep in dependencies:
    print(f"\nMenginstal {dep}...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", dep])
        print(f"✓ {dep} berhasil diinstal")
    except subprocess.CalledProcessError as e:
        print(f"✗ Gagal menginstal {dep}: {e}")
        # Coba dengan --user flag sebagai fallback
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "--user", dep])
            print(f"✓ {dep} berhasil diinstal dengan --user flag")
        except subprocess.CalledProcessError as e2:
            print(f"✗ Gagal total menginstal {dep}")

print("\n\nPemeriksaan dependencies yang terinstal:")
try:
    subprocess.check_call([sys.executable, "-m", "pip", "list"])
except:
    print("Gagal menampilkan daftar paket")

print("\n=== INSTALASI SELESAI ===")
print("\nCATATAN: Untuk OCR (DET-03), Anda perlu menginstal Tesseract OCR secara manual:")
print("1. Download Tesseract dari: https://github.com/UB-Mannheim/tesseract/wiki")
print("2. Instal Tesseract dengan menambahkan ke PATH")
print("3. Setelah itu, jalankan: pip install pytesseract opencv-python")
print("\nUntuk testing tanpa OCR, gunakan: python test_simple.py")