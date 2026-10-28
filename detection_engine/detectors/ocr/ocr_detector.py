"""DET-03: OCR Detection with Tesseract."""

import time
import logging
from typing import List, Dict, Any, Optional, Union
from pathlib import Path

from detection_engine.models.detection_models import (
    DetectionStatus, DetectorType, DetectionResult, DetectorError
)
from detection_engine.detectors.text_keyword.text_keyword_detector import TextKeywordDetector

# Optional imports for OCR
try:
    import pytesseract
    from PIL import Image, ImageEnhance, ImageFilter
    import cv2
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    pytesseract = None
    Image = None


class OCRDetector:
    """DET-03: OCR detector that extracts text from images and uses DET-04."""
    
    def __init__(self, 
                 text_keyword_detector: Optional[TextKeywordDetector] = None,
                 language: str = "ind+eng",  # Tesseract language codes
                 timeout: float = 30.0):
        self.text_keyword_detector = text_keyword_detector or TextKeywordDetector()
        self.language = language
        self.timeout = timeout
        self.logger = logging.getLogger(__name__)
        
        # Check OCR availability
        if not OCR_AVAILABLE:
            self.logger.warning("OCR dependencies not available. Install pytesseract and Pillow.")
        
        # Configure Tesseract path if needed
        self._configure_tesseract()
    
    def _configure_tesseract(self):
        """Configure Tesseract path if not in PATH."""
        try:
            # Try to find tesseract on Windows
            import shutil
            tesseract_cmd = shutil.which('tesseract')
            if tesseract_cmd:
                pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
                self.logger.info(f"Tesseract found at: {tesseract_cmd}")
            else:
                # Common Windows installation paths
                common_paths = [
                    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                    r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
                ]
                for path in common_paths:
                    if Path(path).exists():
                        pytesseract.pytesseract.tesseract_cmd = path
                        self.logger.info(f"Tesseract configured at: {path}")
                        break
                else:
                    self.logger.warning("Tesseract not found. OCR detection will fail.")
        except Exception as e:
            self.logger.warning(f"Could not configure Tesseract: {e}")
    
    def detect(self, 
               image: Union[bytes, str, Path],
               language: str = "id",
               timeout: Optional[float] = None) -> DetectionResult:
        """
        Detect gambling content in image using OCR.
        
        Args:
            image: Image bytes, file path, or Path object
            language: Language for keyword detection
            timeout: Override default timeout
        
        Returns DetectionResult with:
        - label: "OCR Flagged" if gambling content found, else "Clear"
        - score: 0..1 from text keyword detection
        - evidence: OCR text and keyword matches
        """
        start_time = time.time()
        timeout = timeout or self.timeout
        
        # Check OCR availability
        if not OCR_AVAILABLE:
            return self._create_error_result("OCR dependencies not installed", start_time)

        if not self._tesseract_ready():
            return self._create_error_result(
                "Tesseract OCR tidak ditemukan. Lihat docs/INSTALL_TESSERACT.md", start_time)

        try:
            # Load and preprocess image
            pil_image = self._load_image(image)
            if pil_image is None:
                return self._create_skipped_result("Failed to load image", start_time)
            
            # Preprocess image for better OCR
            processed_image = self._preprocess_image(pil_image)
            
            # Perform OCR
            ocr_text = self._perform_ocr(processed_image, timeout)
            
            # Check if text was extracted
            if not ocr_text or not ocr_text.strip():
                return self._create_result(
                    status=DetectionStatus.OK,
                    label="Clear",
                    score=0.0,
                    ocr_text="",
                    language=language,
                    start_time=start_time,
                    evidence={"reason": "No text found in image"}
                )
            
            # Use DET-04 to detect keywords in OCR text
            text_result = self.text_keyword_detector.detect(ocr_text, language, timeout=2.0)
            
            # Convert DET-04 result to OCR result format
            return self._convert_to_ocr_result(text_result, ocr_text, start_time)
            
        except Exception as e:
            self.logger.error(f"Error in OCR detection: {e}")
            return self._create_error_result(str(e), start_time)
    
    def _tesseract_ready(self) -> bool:
        """True if the Tesseract executable can be run."""
        try:
            pytesseract.get_tesseract_version()
            return True
        except Exception:
            return False

    def _resolve_language(self) -> str:
        """Use the configured languages that are installed, else English.

        Tesseract fails outright if a requested language pack (e.g. `ind`)
        is missing, so fall back instead of failing every request.
        """
        if getattr(self, '_resolved_language', None):
            return self._resolved_language
        try:
            installed = set(pytesseract.get_languages(config=''))
        except Exception:
            return self.language
        wanted = [lang for lang in self.language.split('+') if lang in installed]
        if len(wanted) < len(self.language.split('+')):
            self.logger.warning(
                "Tesseract language data missing for %s; using %s",
                self.language, '+'.join(wanted) or 'eng')
        self._resolved_language = '+'.join(wanted) or 'eng'
        return self._resolved_language

    def _load_image(self, image: Union[bytes, str, Path]) -> Optional[Any]:
        """Load image from bytes, file path, or Path object."""
        try:
            if isinstance(image, bytes):
                from io import BytesIO
                return Image.open(BytesIO(image))
            elif isinstance(image, (str, Path)):
                return Image.open(str(image))
            else:
                return None
        except Exception as e:
            self.logger.error(f"Failed to load image: {e}")
            return None
    
    def _preprocess_image(self, image: Any) -> Any:
        """Preprocess image for better OCR results."""
        try:
            # Convert to grayscale
            if image.mode != 'L':
                image = image.convert('L')
            
            # Enhance contrast
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.5)
            
            # Enhance sharpness
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(1.5)
            
            # Apply slight blur to reduce noise
            image = image.filter(ImageFilter.MedianFilter(size=3))
            
            # Resize if too small (min 300px on smallest dimension)
            width, height = image.size
            min_dimension = 300
            if min(width, height) < min_dimension:
                scale = min_dimension / min(width, height)
                new_width = int(width * scale)
                new_height = int(height * scale)
                image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            return image
            
        except Exception as e:
            self.logger.warning(f"Image preprocessing failed: {e}")
            return image  # Return original if preprocessing fails
    
    def _perform_ocr(self, image: Any, timeout: float) -> str:
        """Perform OCR on image using Tesseract."""
        try:
            # Configure Tesseract parameters
            custom_config = r'--oem 3 --psm 3'  # OEM 3 = LSTM, PSM 3 = Fully automatic
            
            # pytesseract kills the Tesseract process and raises RuntimeError
            # once `timeout` seconds have passed
            text = pytesseract.image_to_string(
                image,
                lang=self._resolve_language(),
                config=custom_config,
                timeout=timeout,
            )
            
            # Clean up text
            text = text.strip()
            
            self.logger.info(f"OCR extracted {len(text)} characters")
            return text
            
        except Exception as e:
            self.logger.error(f"OCR failed: {e}")
            raise
    
    def _convert_to_ocr_result(self, 
                               text_result: DetectionResult,
                               ocr_text: str,
                               start_time: float) -> DetectionResult:
        """Convert DET-04 result to OCR result format."""
        
        # Create evidence combining OCR and keyword detection
        evidence = {
            'ocr_text_preview': ocr_text[:500] + "..." if len(ocr_text) > 500 else ocr_text,
            'ocr_character_count': len(ocr_text),
            'keyword_detection': text_result.evidence if text_result.evidence else {},
        }
        
        # Merge with text detection evidence
        if text_result.evidence:
            evidence.update({
                'matches_found': text_result.evidence.get('matches_found', 0),
                'keywords_found': text_result.evidence.get('keywords_found', []),
            })
        
        # Determine label based on DET-04 result
        if text_result.status == DetectionStatus.OK:
            if text_result.score > 0:
                label = "OCR Flagged"
            else:
                label = "Clear"
        else:
            label = "OCR Failed"
        
        return DetectionResult(
            detector=DetectorType.OCR,
            status=text_result.status,
            label=label,
            score=text_result.score,
            evidence=evidence,
            error=text_result.error,
            duration_ms=int((time.time() - start_time) * 1000),
        )
    
    def _create_result(self, 
                       status: DetectionStatus,
                       label: str,
                       score: float,
                       ocr_text: str,
                       language: str,
                       start_time: float,
                       evidence: Optional[Dict[str, Any]] = None) -> DetectionResult:
        """Create a detection result."""
        if evidence is None:
            evidence = {}
        
        evidence['ocr_text_preview'] = ocr_text[:500] + "..." if len(ocr_text) > 500 else ocr_text
        evidence['ocr_character_count'] = len(ocr_text)
        
        return DetectionResult(
            detector=DetectorType.OCR,
            status=status,
            label=label,
            score=score,
            evidence=evidence,
            duration_ms=int((time.time() - start_time) * 1000),
        )
    
    def _create_skipped_result(self, reason: str, start_time: float) -> DetectionResult:
        """Create skipped result."""
        return DetectionResult(
            detector=DetectorType.OCR,
            status=DetectionStatus.SKIPPED,
            label="Skipped",
            score=0.0,
            evidence={'reason': reason},
            duration_ms=int((time.time() - start_time) * 1000),
        )
    
    def _create_error_result(self, error_message: str, start_time: float) -> DetectionResult:
        """Create error result."""
        return DetectionResult(
            detector=DetectorType.OCR,
            status=DetectionStatus.FAILED,
            label="Error",
            score=0.0,
            error=DetectorError(
                code="OCR_DETECTION_ERROR",
                message_id="ocr_detection_failed",
                details={'error': error_message}
            ),
            duration_ms=int((time.time() - start_time) * 1000),
        )
    
    def detect_from_bytes(self, image_bytes: bytes, language: str = "id") -> DetectionResult:
        """Convenience method to detect from image bytes."""
        return self.detect(image_bytes, language)
    
    def detect_from_file(self, file_path: Union[str, Path], language: str = "id") -> DetectionResult:
        """Convenience method to detect from file path."""
        return self.detect(file_path, language)
    
    def get_ocr_confidence(self, image: Union[bytes, str, Path]) -> Dict[str, Any]:
        """Get OCR confidence data (for debugging)."""
        if not OCR_AVAILABLE:
            return {"error": "OCR not available"}
        
        try:
            image_obj = self._load_image(image)
            if image_obj is None:
                return {"error": "Failed to load image"}
            
            # Get data with confidence
            data = pytesseract.image_to_data(
                image_obj,
                lang=self.language,
                output_type=pytesseract.Output.DICT
            )
            
            # Calculate average confidence
            confidences = [c for c in data['conf'] if c != -1]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
            
            return {
                'average_confidence': avg_confidence,
                'word_count': len(data['text']),
                'character_count': sum(len(t) for t in data['text']),
                'confidences': confidences[:10],  # First 10 for preview
            }
            
        except Exception as e:
            return {"error": str(e)}


# Default detector instance (will be None if OCR not available)
default_ocr_detector = OCRDetector() if OCR_AVAILABLE else None