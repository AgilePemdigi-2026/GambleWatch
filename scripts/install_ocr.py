#!/usr/bin/env python3
"""OCR Dependencies Installer for DET-03."""

import subprocess
import sys
import os

def run_command(cmd, description):
    """Run a command and print result."""
    print(f"\n📦 {description}...")
    try:
        result = subprocess.run(
            cmd, 
            shell=True, 
            capture_output=True, 
            text=True,
            check=True
        )
        print(f"✅ Success")
        if result.stdout.strip():
            print(f"   Output: {result.stdout.strip()}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed: {e.stderr.strip() if e.stderr else e}")
        return False

def check_import(module_name, install_cmd=None):
    """Check if a module can be imported."""
    try:
        __import__(module_name)
        print(f"✅ {module_name} already installed")
        return True
    except ImportError:
        if install_cmd:
            print(f"❌ {module_name} not found")
            return False
        else:
            print(f"⚠️  {module_name} not found")
            return False

def main():
    print("=" * 70)
    print("📦 OCR DEPENDENCIES INSTALLER FOR DET-03")
    print("=" * 70)
    
    # Check Python version
    print(f"\n🐍 Python {sys.version}")
    
    # Check and install dependencies
    dependencies = [
        ("pytesseract", "pip install pytesseract"),
        ("PIL", "pip install pillow"),
        ("cv2", "pip install opencv-python"),
        ("numpy", "pip install numpy"),
        ("regex", "pip install regex"),
    ]
    
    print("\n🔍 Checking current installations...")
    for module, cmd in dependencies:
        if module == "PIL":
            check_import("PIL.Image", cmd)
        else:
            check_import(module, cmd)
    
    # Ask for installation
    print("\n" + "=" * 70)
    response = input("\nDo you want to install missing dependencies? (y/n): ")
    
    if response.lower() != 'y':
        print("\nInstallation cancelled.")
        return
    
    # Install dependencies
    print("\n" + "=" * 70)
    print("🚀 Installing dependencies...")
    
    success_count = 0
    for module, cmd in dependencies:
        if not check_import(module if module != "PIL" else "PIL.Image", None):
            if run_command(cmd, f"Installing {module}"):
                success_count += 1
    
    print("\n" + "=" * 70)
    print("🔧 TESSERACT OCR INSTALLATION")
    print("-" * 70)
    
    print("""
📥 MANUAL INSTALLATION REQUIRED:

1. Download Tesseract OCR for Windows:
   https://github.com/UB-Mannheim/tesseract/wiki

2. Run the installer:
   - Choose default installation path
   - CHECK "Add to PATH" during installation
   - Complete installation

3. Download Indonesian language data (optional):
   https://github.com/tesseract-ocr/tessdata
   - Download 'ind.traineddata'
   - Place in: C:\Program Files\Tesseract-OCR\tessdata\
""")
    
    # Test installation
    print("\n" + "=" * 70)
    print("🧪 Testing installation...")
    
    test_imports = [
        ("pytesseract", "Tesseract wrapper"),
        ("PIL.Image", "Image processing"),
        ("cv2", "OpenCV"),
        ("numpy", "Numerical operations"),
    ]
    
    all_ok = True
    for module, desc in test_imports:
        try:
            if module == "PIL.Image":
                __import__("PIL.Image")
            else:
                __import__(module)
            print(f"✅ {module:<15} {desc}")
        except ImportError:
            print(f"❌ {module:<15} {desc} - NOT INSTALLED")
            all_ok = False
    
    # Test Tesseract
    print("\n🔍 Testing Tesseract...")
    try:
        import pytesseract
        import shutil
        
        # Try to find Tesseract
        tesseract_path = shutil.which("tesseract")
        if tesseract_path:
            print(f"✅ Tesseract found: {tesseract_path}")
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
        else:
            # Check common paths
            common_paths = [
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            ]
            
            for path in common_paths:
                if os.path.exists(path):
                    print(f"✅ Tesseract found at: {path}")
                    pytesseract.pytesseract.tesseract_cmd = path
                    break
            else:
                print("⚠️  Tesseract not found. Please install from link above.")
                all_ok = False
                
    except Exception as e:
        print(f"❌ Tesseract test failed: {e}")
        all_ok = False
    
    print("\n" + "=" * 70)
    if all_ok:
        print("🎉 INSTALLATION COMPLETE!")
        print("\n✅ All OCR dependencies installed")
        print("✅ Ready for DET-03 testing")
        print("\n📝 Test with: python test_all_detectors.py")
    else:
        print("⚠️  INSTALLATION INCOMPLETE")
        print("\n❌ Some dependencies missing")
        print("📦 Run: pip install pytesseract pillow opencv-python numpy regex")
        print("🔧 Install Tesseract from: https://github.com/UB-Mannheim/tesseract/wiki")
    
    print("\n" + "=" * 70)

if __name__ == "__main__":
    main()