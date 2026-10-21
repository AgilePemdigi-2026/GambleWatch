"""Validate detection input with Indonesian error messages."""

import re
from pathlib import Path
from typing import Optional, Tuple, Union
from urllib.parse import urlparse

from detection_engine.models.detection_models import DetectionInput

# Try to import magic module, but handle if not available
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False
    magic = None


class InputValidator:
    """Validate detection engine input."""
    
    # Indonesian error messages
    ERROR_MESSAGES = {
        "no_input": "Tidak ada input yang diberikan. Berikan URL atau screenshot.",
        "invalid_url": "URL tidak valid. Harus menggunakan format http:// atau https://.",
        "image_too_large": "Ukuran gambar terlalu besar (maksimum {max_mb} MB).",
        "unsupported_image_format": "Format gambar tidak didukung. Gunakan JPG atau PNG.",
        "image_dimension_too_large": "Dimensi gambar terlalu besar (maksimum {max_dimension}px).",
        "file_not_found": "File tidak ditemukan: {path}",
        "image_magic_bytes_failed": "Tidak dapat memverifikasi format gambar.",
    }
    
    def __init__(self, max_image_size_mb: int = 5, max_image_dimension: int = 4096):
        self.max_image_size_mb = max_image_size_mb
        self.max_image_dimension = max_image_dimension
    
    def validate_input(self, detection_input: DetectionInput) -> Tuple[bool, Optional[str]]:
        """
        Validate detection input.
        Returns (is_valid, error_message)
        """
        try:
            # Check at least one input is provided
            if not detection_input.url and not detection_input.screenshot:
                return False, self.ERROR_MESSAGES["no_input"]
            
            # Validate URL if provided
            if detection_input.url:
                is_valid, error = self._validate_url(str(detection_input.url))
                if not is_valid:
                    return False, error
            
            # Validate screenshot if provided
            if detection_input.screenshot:
                is_valid, error = self._validate_screenshot(detection_input.screenshot)
                if not is_valid:
                    return False, error
            
            return True, None
            
        except Exception as e:
            return False, str(e)
    
    def _validate_url(self, url: str) -> Tuple[bool, Optional[str]]:
        """Validate URL format."""
        try:
            parsed = urlparse(url)
            if not parsed.scheme or parsed.scheme not in ['http', 'https']:
                return False, self.ERROR_MESSAGES["invalid_url"]
            
            if not parsed.netloc:
                return False, self.ERROR_MESSAGES["invalid_url"]
            
            return True, None
            
        except Exception:
            return False, self.ERROR_MESSAGES["invalid_url"]
    
    def _validate_screenshot(self, screenshot: Union[bytes, str]) -> Tuple[bool, Optional[str]]:
        """Validate screenshot image."""
        try:
            if isinstance(screenshot, bytes):
                return self._validate_image_bytes(screenshot)
            elif isinstance(screenshot, str):
                return self._validate_image_file(screenshot)
            else:
                return False, "screenshot harus berupa bytes atau path file"
                
        except Exception as e:
            return False, str(e)
    
    def _validate_image_bytes(self, image_bytes: bytes) -> Tuple[bool, Optional[str]]:
        """Validate image bytes."""
        # Check size
        size_mb = len(image_bytes) / (1024 * 1024)
        if size_mb > self.max_image_size_mb:
            return False, self.ERROR_MESSAGES["image_too_large"].format(max_mb=self.max_image_size_mb)
        
        # Check magic bytes for format
        try:
            if MAGIC_AVAILABLE and magic:
                mime = magic.Magic(mime=True)
                mime_type = mime.from_buffer(image_bytes[:1024])
                
                if mime_type not in ['image/jpeg', 'image/png']:
                    return False, self.ERROR_MESSAGES["unsupported_image_format"]
            else:
                # Fallback to checking magic bytes manually
                if not (image_bytes.startswith(b'\xff\xd8') or  # JPEG
                        image_bytes.startswith(b'\x89PNG\r\n\x1a\n')):  # PNG
                    return False, self.ERROR_MESSAGES["unsupported_image_format"]
                
        except Exception:
            # Final fallback to manual checking
            if not (image_bytes.startswith(b'\xff\xd8') or  # JPEG
                    image_bytes.startswith(b'\x89PNG\r\n\x1a\n')):  # PNG
                return False, self.ERROR_MESSAGES["unsupported_image_format"]
        
        return True, None
    
    def _validate_image_file(self, file_path: str) -> Tuple[bool, Optional[str]]:
        """Validate image file."""
        path = Path(file_path)
        
        # Check if file exists
        if not path.exists():
            return False, self.ERROR_MESSAGES["file_not_found"].format(path=file_path)
        
        # Check file size
        size_mb = path.stat().st_size / (1024 * 1024)
        if size_mb > self.max_image_size_mb:
            return False, self.ERROR_MESSAGES["image_too_large"].format(max_mb=self.max_image_size_mb)
        
        # Check file extension
        if path.suffix.lower() not in ['.jpg', '.jpeg', '.png']:
            return False, self.ERROR_MESSAGES["unsupported_image_format"]
        
        # Check magic bytes
        try:
            with open(path, 'rb') as f:
                header = f.read(1024)
                
            if not (header.startswith(b'\xff\xd8') or  # JPEG
                    header.startswith(b'\x89PNG\r\n\x1a\n')):  # PNG
                return False, self.ERROR_MESSAGES["unsupported_image_format"]
                
        except Exception:
            return False, self.ERROR_MESSAGES["image_magic_bytes_failed"]
        
        return True, None
    
    def get_error_message(self, error_code: str, **kwargs) -> str:
        """Get Indonesian error message for error code."""
        message = self.ERROR_MESSAGES.get(error_code, "Error tidak diketahui.")
        return message.format(**kwargs)


# Default validator instance
default_validator = InputValidator()