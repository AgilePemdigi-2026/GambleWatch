
from detection_engine.models.detection_models import (
    DetectionInput,
    DetectionResult,
    DetectionStatus,
    DetectorType,
)
from detection_engine.pipeline import DetectionPipeline


class MockDetector:
    """Detektor tiruan untuk menguji integrasi pipeline."""

    def __init__(self, detector_type, score, label):
        self.detector_type = detector_type
        self.score = score
        self.label = label
        self.calls = []

    def detect(self, value, timeout=None):
        self.calls.append(value)
        return DetectionResult(
            detector=self.detector_type,
            status=DetectionStatus.OK,
            label=self.label,
            score=self.score,
            evidence={"source": "mock"},
            duration_ms=1,
        )


def test_multimodal_pipeline_runs_all_four_detectors():
    url_detector = MockDetector(
        DetectorType.URL_PATTERN, 0.8, "High Risk Pattern"
    )
    text_detector = MockDetector(
        DetectorType.TEXT_KEYWORD, 0.7, "Keywords Found"
    )
    ocr_detector = MockDetector(
        DetectorType.OCR, 0.6, "OCR Flagged"
    )
    visual_detector = MockDetector(
        DetectorType.VISUAL_SIMILARITY, 0.9, "Visual Match"
    )

    pipeline = DetectionPipeline(
        url_detector=url_detector,
        text_detector=text_detector,
        ocr_detector=ocr_detector,
        visual_detector=visual_detector,
    )

    screenshot = b"mock screenshot"
    detection_input = DetectionInput(
        url="https://example.com",
        screenshot=screenshot,
        scraped={"page_text": "slot gacor"},
    )

    result = pipeline.run_all(detection_input)

    assert len(url_detector.calls) == 1
    assert len(text_detector.calls) == 1
    assert len(ocr_detector.calls) == 1
    assert len(visual_detector.calls) == 1

    assert set(item.detector for item in result.results) == {
        DetectorType.URL_PATTERN,
        DetectorType.TEXT_KEYWORD,
        DetectorType.OCR,
        DetectorType.VISUAL_SIMILARITY,
    }

    assert all(
        item.status == DetectionStatus.OK
        for item in result.results
    )

    summary = pipeline.get_summary(result)
    assert set(summary["modules"]) == {
        "url_pattern",
        "visual_similarity",
        "ocr",
        "keyword_analysis",
    }

def test_multimodal_pipeline_continues_when_one_detector_fails():
    url_detector = MockDetector(
        DetectorType.URL_PATTERN, 0.8, "High Risk Pattern"
    )
    text_detector = MockDetector(
        DetectorType.TEXT_KEYWORD, 0.7, "Keywords Found"
    )
    visual_detector = MockDetector(
        DetectorType.VISUAL_SIMILARITY, 0.9, "Visual Match"
    )

    class FailingOCRDetector:
        def detect(self, value, timeout=None):
            raise RuntimeError("OCR test failure")

    pipeline = DetectionPipeline(
        url_detector=url_detector,
        text_detector=text_detector,
        ocr_detector=FailingOCRDetector(),
        visual_detector=visual_detector,
    )

    detection_input = DetectionInput(
        url="https://example.com",
        screenshot=b"mock screenshot",
        scraped={"page_text": "slot gacor"},
    )

    result = pipeline.run_all(detection_input)

    results_by_detector = {
        item.detector: item for item in result.results
    }

    assert len(result.results) == 4
    assert results_by_detector[DetectorType.OCR].status == DetectionStatus.FAILED
    assert results_by_detector[DetectorType.URL_PATTERN].status == DetectionStatus.OK
    assert results_by_detector[DetectorType.TEXT_KEYWORD].status == DetectionStatus.OK
    assert results_by_detector[DetectorType.VISUAL_SIMILARITY].status == DetectionStatus.OK
