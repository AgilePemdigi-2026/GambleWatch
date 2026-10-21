"""GambleWatch Detection Engine."""

from detection_engine.models.detection_models import (
    DetectionInput, PipelineResult, DetectionResult, 
    DetectionStatus, DetectorType, DetectorError
)
from detection_engine.config.detection_config import config
from detection_engine.validation.input_validator import InputValidator, default_validator
from detection_engine.detectors.url_pattern.url_pattern_detector import URLPatternDetector, default_url_pattern_detector
from detection_engine.detectors.text_keyword.text_keyword_detector import TextKeywordDetector, default_text_keyword_detector
from detection_engine.detectors.ocr.ocr_detector import OCRDetector, default_ocr_detector
from detection_engine.pipeline import DetectionPipeline, default_pipeline


def detect(input_data: dict) -> dict:
    """
    Main detection function for external use.
    
    Args:
        input_data: Dictionary with url, screenshot (optional), scraped (optional)
    
    Returns:
        Dictionary with detection results
    """
    try:
        # Create detection input
        detection_input = DetectionInput(**input_data)
        
        # Validate input
        validator = InputValidator()
        is_valid, error_message = validator.validate_input(detection_input)
        if not is_valid:
            return {
                'error': error_message,
                'request_id': None,
                'results': [],
            }
        
        # Run pipeline
        pipeline = DetectionPipeline()
        result = pipeline.run_all(detection_input)
        
        # Get summary
        summary = pipeline.get_summary(result)
        
        return {
            'request_id': result.request_id,
            'results': [r.dict() for r in result.results],
            'summary': summary,
            'label_breakdown': result.get_label_breakdown(),
        }
        
    except Exception as e:
        return {
            'error': str(e),
            'request_id': None,
            'results': [],
        }


__all__ = [
    # Models
    'DetectionInput', 'PipelineResult', 'DetectionResult',
    'DetectionStatus', 'DetectorType', 'DetectorError',
    
    # Config
    'config',
    
    # Validation
    'InputValidator', 'default_validator',
    
    # Detectors
    'URLPatternDetector', 'default_url_pattern_detector',
    'TextKeywordDetector', 'default_text_keyword_detector',
    'OCRDetector', 'default_ocr_detector',
    
    # Pipeline
    'DetectionPipeline', 'default_pipeline',
    
    # Main function
    'detect',
]