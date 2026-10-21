"""Pipeline for running all detectors concurrently."""

import time
import uuid
import logging
import asyncio
from typing import List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError

from detection_engine.models.detection_models import (
    DetectionInput, PipelineResult, DetectionResult, DetectionStatus, DetectorType
)
from detection_engine.config.detection_config import config
from detection_engine.detectors.url_pattern.url_pattern_detector import URLPatternDetector
from detection_engine.detectors.text_keyword.text_keyword_detector import TextKeywordDetector
from detection_engine.detectors.ocr.ocr_detector import OCRDetector


class DetectionPipeline:
    """Pipeline that runs all detectors concurrently."""
    
    def __init__(self,
                 url_detector: Optional[URLPatternDetector] = None,
                 text_detector: Optional[TextKeywordDetector] = None,
                 ocr_detector: Optional[OCRDetector] = None):
        self.url_detector = url_detector or URLPatternDetector()
        self.text_detector = text_detector or TextKeywordDetector()
        self.ocr_detector = ocr_detector or (OCRDetector() if OCRDetector else None)
        
        self.logger = logging.getLogger(__name__)
        self.max_workers = config.max_workers
    
    def run_all(self, detection_input: DetectionInput) -> PipelineResult:
        """
        Run all detectors concurrently.
        
        Each detector runs independently. One failure or timeout doesn't affect the others.
        """
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        self.logger.info(f"Starting detection pipeline for request {request_id}")
        
        # Prepare tasks for each detector
        tasks = self._prepare_tasks(detection_input)
        
        # Run tasks concurrently
        results = self._run_concurrently(tasks)
        
        # Create pipeline result
        pipeline_result = PipelineResult(
            request_id=request_id,
            input=detection_input,
            results=results,
        )
        
        duration = (time.time() - start_time) * 1000
        self.logger.info(f"Pipeline completed in {duration:.0f}ms with {len(results)} results")
        
        return pipeline_result
    
    def _prepare_tasks(self, detection_input: DetectionInput) -> List[Dict[str, Any]]:
        """Prepare tasks for each detector based on input."""
        tasks = []
        
        # DET-01: URL Pattern Detection
        if detection_input.url:
            tasks.append({
                'detector_type': DetectorType.URL_PATTERN,
                'task': self._run_url_detection,
                'args': (str(detection_input.url),),
                'timeout': config.url_pattern_timeout,
                'description': 'URL pattern detection',
            })
        else:
            tasks.append({
                'detector_type': DetectorType.URL_PATTERN,
                'task': self._create_skipped_task,
                'args': ('No URL provided',),
                'timeout': 0.1,
                'description': 'URL pattern detection (skipped)',
            })
        
        # DET-04: Text Keyword Detection (from scraped text)
        if detection_input.scraped and detection_input.scraped.get('page_text'):
            tasks.append({
                'detector_type': DetectorType.TEXT_KEYWORD,
                'task': self._run_text_detection,
                'args': (detection_input.scraped['page_text'],),
                'timeout': config.text_keyword_timeout,
                'description': 'Text keyword detection',
            })
        else:
            tasks.append({
                'detector_type': DetectorType.TEXT_KEYWORD,
                'task': self._create_skipped_task,
                'args': ('No scraped text provided',),
                'timeout': 0.1,
                'description': 'Text keyword detection (skipped)',
            })
        
        # DET-03: OCR Detection (from screenshot)
        if detection_input.screenshot:
            if self.ocr_detector:
                tasks.append({
                    'detector_type': DetectorType.OCR,
                    'task': self._run_ocr_detection,
                    'args': (detection_input.screenshot,),
                    'timeout': config.ocr_timeout,
                    'description': 'OCR detection',
                })
            else:
                tasks.append({
                    'detector_type': DetectorType.OCR,
                    'task': self._create_error_task,
                    'args': ('OCR detector not available',),
                    'timeout': 0.1,
                    'description': 'OCR detection (not available)',
                })
        else:
            tasks.append({
                'detector_type': DetectorType.OCR,
                'task': self._create_skipped_task,
                'args': ('No screenshot provided',),
                'timeout': 0.1,
                'description': 'OCR detection (skipped)',
            })
        
        # DET-02: Visual Similarity Detection (placeholder for now)
        # This would be added when DET-02 is implemented
        tasks.append({
            'detector_type': DetectorType.VISUAL_SIMILARITY,
            'task': self._create_skipped_task,
            'args': ('Visual similarity detection not implemented',),
            'timeout': 0.1,
            'description': 'Visual similarity detection (skipped)',
        })
        
        return tasks
    
    def _run_concurrently(self, tasks: List[Dict[str, Any]]) -> List[DetectionResult]:
        """Run tasks concurrently with timeouts."""
        results = []
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_task = {}
            for task in tasks:
                future = executor.submit(
                    task['task'], task['detector_type'], *task['args'], task['timeout']
                )
                future_to_task[future] = task
            
            # Collect results as they complete
            for future in as_completed(future_to_task):
                task = future_to_task[future]
                
                try:
                    result = future.result(timeout=task['timeout'] + 1.0)
                    results.append(result)
                    
                except TimeoutError:
                    self.logger.warning(f"Task timeout: {task['description']}")
                    results.append(self._create_timeout_result(task['detector_type']))
                    
                except Exception as e:
                    self.logger.error(f"Task failed: {task['description']} - {e}")
                    results.append(self._create_error_result(task['detector_type'], str(e)))
        
        # Sort results by detector type for consistency
        results.sort(key=lambda r: r.detector.value)
        
        return results
    
    def _run_url_detection(self, detector_type: DetectorType, url: str, timeout: float) -> DetectionResult:
        """Run URL pattern detection."""
        return self.url_detector.detect(url, timeout)
    
    def _run_text_detection(self, detector_type: DetectorType, text: str, timeout: float) -> DetectionResult:
        """Run text keyword detection."""
        return self.text_detector.detect(text, timeout=timeout)
    
    def _run_ocr_detection(self, detector_type: DetectorType, screenshot, timeout: float) -> DetectionResult:
        """Run OCR detection."""
        return self.ocr_detector.detect(screenshot, timeout=timeout)
    
    def _create_skipped_task(self, detector_type: DetectorType, reason: str, timeout: float) -> DetectionResult:
        """Create a skipped result task."""
        # Simulate some processing time
        time.sleep(0.01)
        
        return DetectionResult(
            detector=detector_type,
            status=DetectionStatus.SKIPPED,
            label="Skipped",
            score=0.0,
            evidence={'reason': reason},
            duration_ms=10,
        )
    
    def _create_error_task(self, detector_type: DetectorType, error_message: str, timeout: float) -> DetectionResult:
        """Create an error result task."""
        # Simulate some processing time
        time.sleep(0.01)
        
        from detection_engine.models.detection_models import DetectorError
        
        return DetectionResult(
            detector=detector_type,
            status=DetectionStatus.FAILED,
            label="Error",
            score=0.0,
            error=DetectorError(
                code="DETECTOR_UNAVAILABLE",
                message_id="detector_not_available",
                details={'error': error_message}
            ),
            duration_ms=10,
        )
    
    def _create_timeout_result(self, detector_type: DetectorType) -> DetectionResult:
        """Create a timeout result."""
        from detection_engine.models.detection_models import DetectorError
        
        return DetectionResult(
            detector=detector_type,
            status=DetectionStatus.FAILED,
            label="Timeout",
            score=0.0,
            error=DetectorError(
                code="TIMEOUT",
                message_id="detection_timeout",
                details={'detector': detector_type.value}
            ),
            duration_ms=int(config.get_detector_timeout(detector_type.value) * 1000),
        )
    
    def _create_error_result(self, detector_type: DetectorType, error_message: str) -> DetectionResult:
        """Create an error result."""
        from detection_engine.models.detection_models import DetectorError
        
        return DetectionResult(
            detector=detector_type,
            status=DetectionStatus.FAILED,
            label="Error",
            score=0.0,
            error=DetectorError(
                code="EXECUTION_ERROR",
                message_id="detection_execution_error",
                details={'error': error_message}
            ),
            duration_ms=10,
        )
    
    async def run_all_async(self, detection_input: DetectionInput) -> PipelineResult:
        """Async version of run_all (for API usage)."""
        # This would use asyncio for truly async operation
        # For now, just wrap the sync version
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self.run_all, detection_input)
    
    def get_summary(self, pipeline_result: PipelineResult) -> Dict[str, Any]:
        """Get a summary of pipeline results."""
        summary = {
            'request_id': pipeline_result.request_id,
            'total_detectors': len(pipeline_result.results),
            'successful': 0,
            'failed': 0,
            'skipped': 0,
            'detector_results': {},
            'label_breakdown': pipeline_result.get_label_breakdown(),
            'overall_risk': 'low',
            'processing_time_ms': 0,
        }
        
        # Calculate statistics
        for result in pipeline_result.results:
            summary['detector_results'][result.detector.value] = {
                'status': result.status.value,
                'label': result.label,
                'score': result.score,
                'duration_ms': result.duration_ms,
            }
            
            if result.status == DetectionStatus.OK:
                summary['successful'] += 1
            elif result.status == DetectionStatus.FAILED:
                summary['failed'] += 1
            else:
                summary['skipped'] += 1
        
        # Calculate overall risk (take highest score)
        ok_scores = [r.score for r in pipeline_result.results if r.status == DetectionStatus.OK]
        if ok_scores:
            max_score = max(ok_scores)
            if max_score >= 0.7:
                summary['overall_risk'] = 'high'
            elif max_score >= 0.4:
                summary['overall_risk'] = 'medium'
            else:
                summary['overall_risk'] = 'low'
        
        # Calculate total processing time
        summary['processing_time_ms'] = sum(r.duration_ms for r in pipeline_result.results)
        
        return summary


# Default pipeline instance
default_pipeline = DetectionPipeline()