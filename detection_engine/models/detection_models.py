"""Detection models following the shared contract from SRS."""

from enum import Enum
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, HttpUrl, field_validator
from datetime import datetime


class DetectionStatus(str, Enum):
    """Status of a detector run."""
    OK = "ok"
    SKIPPED = "skipped"
    FAILED = "failed"


class DetectorType(str, Enum):
    """Types of detectors."""
    URL_PATTERN = "url_pattern"
    TEXT_KEYWORD = "text_keyword"
    OCR = "ocr"
    VISUAL_SIMILARITY = "visual_similarity"


class DetectionInput(BaseModel):
    """
    Input to the detection pipeline.
    At least one of url or screenshot is required.
    """
    url: Optional[HttpUrl] = None
    screenshot: Optional[Union[bytes, str]] = None  # bytes or file path
    scraped: Optional[Dict[str, Any]] = Field(default_factory=lambda: {
        "page_text": "",
        "title": "",
        "meta": {},
        "links": [],
        "media_urls": [],
    })

    @field_validator('screenshot', mode='before')
    @classmethod
    def validate_screenshot(cls, v):
        """Validate screenshot if provided."""
        if v is None:
            return v
        
        if isinstance(v, bytes):
            if len(v) > 5 * 1024 * 1024:  # 5 MB
                raise ValueError("Image size exceeds 5 MB limit")
        elif isinstance(v, str):
            # Will be validated as file path during processing
            pass
        else:
            raise ValueError("screenshot must be bytes or file path")
        return v

    @field_validator('url', mode='before')
    @classmethod
    def validate_url_scheme(cls, v):
        """Only allow http/https URLs."""
        if v is not None:
            url_str = str(v)
            if not (url_str.startswith('http://') or url_str.startswith('https://')):
                raise ValueError("Only http and https URLs are allowed")
        return v


class DetectorError(BaseModel):
    """Error information from a detector."""
    code: str
    message_id: str  # For i18n, maps to Indonesian messages
    details: Optional[Dict[str, Any]] = None


class DetectionResult(BaseModel):
    """
    Result from a single detector.
    Each detector returns {detector, status, label, score, evidence, error, duration_ms}
    """
    detector: DetectorType
    status: DetectionStatus
    label: str  # e.g., "High Risk Pattern", "Visual Match %", "OCR Flagged", "Keywords Found"
    score: float = Field(ge=0.0, le=1.0)  # 0..1
    evidence: Optional[Dict[str, Any]] = None  # Detector-specific evidence
    error: Optional[DetectorError] = None
    duration_ms: int = Field(ge=0)

    created_at: datetime = Field(default_factory=datetime.now)


class PipelineResult(BaseModel):
    """Result from running all detectors."""
    request_id: str
    input: DetectionInput
    results: List[DetectionResult]
    created_at: datetime = Field(default_factory=datetime.now)
    
    def get_detector_result(self, detector_type: DetectorType) -> Optional[DetectionResult]:
        """Get result for a specific detector type."""
        for result in self.results:
            if result.detector == detector_type:
                return result
        return None
    
    def get_label_breakdown(self) -> Dict[str, Any]:
        """Get the parameter breakdown from SRS."""
        breakdown = {}
        
        # DET-01 URL Pattern
        url_result = self.get_detector_result(DetectorType.URL_PATTERN)
        if url_result and url_result.status == DetectionStatus.OK:
            breakdown["url_pattern"] = url_result.label  # "High Risk Pattern" / "Normal"
        
        # DET-02 Visual Similarity
        visual_result = self.get_detector_result(DetectorType.VISUAL_SIMILARITY)
        if visual_result and visual_result.status == DetectionStatus.OK:
            breakdown["visual_match"] = visual_result.label  # "Visual Match %"
        
        # DET-03 OCR
        ocr_result = self.get_detector_result(DetectorType.OCR)
        if ocr_result and ocr_result.status == DetectionStatus.OK:
            breakdown["ocr"] = ocr_result.label  # "OCR Flagged" / "Clear"
        
        # DET-04 Text/Keyword
        text_result = self.get_detector_result(DetectorType.TEXT_KEYWORD)
        if text_result and text_result.status == DetectionStatus.OK:
            breakdown["keywords"] = text_result.evidence.get("keywords_found", []) if text_result.evidence else []
        
        return breakdown