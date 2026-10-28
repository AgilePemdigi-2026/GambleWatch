"""Configuration for detection engine timeouts and thresholds."""

from typing import Dict, Any
from pydantic import BaseModel, Field


class DetectionConfig(BaseModel):
    """Configuration for all detectors."""
    
    # Timeouts in seconds
    url_pattern_timeout: float = 1.0  # DET-01
    text_keyword_timeout: float = 2.0  # DET-04
    ocr_timeout: float = 30.0  # DET-03
    visual_similarity_timeout: float = 15.0  # DET-02
    
    # Score thresholds
    url_pattern_high_risk_threshold: float = 0.6  # DET-01
    text_keyword_score_threshold: float = 0.3  # DET-04
    visual_similarity_match_threshold: float = 0.7  # DET-02 (pHash distance <= 6)

    # Indication level of the combined score (PRD: Rendah / Sedang / Tinggi)
    indication_medium_threshold: float = 0.4
    indication_high_threshold: float = 0.7
    
    # Image constraints
    max_image_size_mb: int = 5
    max_image_dimension: int = 4096
    
    # Keyword provider
    keyword_cache_ttl_minutes: int = 15
    keyword_local_fallback_path: str = "data/keywords.json"
    
    # Reference index
    reference_index_path: str = "data/reference_index.npz"
    clip_model_name: str = "openai/clip-vit-base-patch32"  # For DET-02
    
    # Logging
    log_level: str = "INFO"
    structured_logging: bool = True
    
    # Performance
    max_workers: int = 4
    batch_size: int = 10
    
    @classmethod
    def default(cls) -> "DetectionConfig":
        """Return default configuration."""
        return cls()
    
    def get_detector_timeout(self, detector_type: str) -> float:
        """Get timeout for a specific detector type."""
        timeouts = {
            "url_pattern": self.url_pattern_timeout,
            "text_keyword": self.text_keyword_timeout,
            "ocr": self.ocr_timeout,
            "visual_similarity": self.visual_similarity_timeout,
        }
        return timeouts.get(detector_type, 5.0)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary."""
        return self.model_dump()


# Global configuration instance
config = DetectionConfig.default()