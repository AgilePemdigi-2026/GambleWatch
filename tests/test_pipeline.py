"""Pipeline: combined score, Rendah/Sedang/Tinggi indication, timeouts."""

import time

import pytest

from detection_engine.config.detection_config import config
from detection_engine.models.detection_models import (
    DetectionInput, DetectionResult, DetectionStatus, DetectorType,
)
from detection_engine.pipeline import DetectionPipeline


def result(detector, score, status=DetectionStatus.OK):
    return DetectionResult(detector=detector, status=status, label="x",
                           score=score, duration_ms=1)


def test_combine_scores_ignores_detectors_that_did_not_run():
    results = [
        result(DetectorType.URL_PATTERN, 0.72),
        result(DetectorType.OCR, 0.0, DetectionStatus.FAILED),
        result(DetectorType.VISUAL_SIMILARITY, 0.0, DetectionStatus.SKIPPED),
    ]
    assert DetectionPipeline.combine_scores(results) == pytest.approx(0.72)


def test_combine_scores_agreement_raises_confidence():
    one = DetectionPipeline.combine_scores([result(DetectorType.URL_PATTERN, 0.5)])
    two = DetectionPipeline.combine_scores([
        result(DetectorType.URL_PATTERN, 0.5),
        result(DetectorType.TEXT_KEYWORD, 0.5),
    ])
    assert two == pytest.approx(0.75)
    assert two > one


def test_ocr_and_keywords_count_once():
    """Both read the same words, so they must not double-count."""
    score = DetectionPipeline.combine_scores([
        result(DetectorType.OCR, 0.6),
        result(DetectorType.TEXT_KEYWORD, 0.5),
    ])
    assert score == pytest.approx(0.6)


@pytest.fixture(scope="module")
def pipeline():
    return DetectionPipeline()


def run(pipeline, url, page_text=""):
    data = DetectionInput(url=url, scraped={"page_text": page_text})
    return pipeline.get_summary(pipeline.run_all(data))


def test_gambling_site_is_tinggi(pipeline):
    summary = run(pipeline, "https://slotgacor88.bet", "Daftar slot gacor, bonus new member")
    assert summary["indication"] == "Tinggi"
    assert summary["overall_risk"] == "high"
    assert summary["overall_score"] >= config.indication_high_threshold
    assert set(summary["modules"]) == {
        "url_pattern", "visual_similarity", "ocr", "keyword_analysis"}
    assert summary["modules"]["url_pattern"]["score"] > 0.8
    assert summary["modules"]["visual_similarity"]["status"] == "skipped"


def test_normal_site_is_rendah(pipeline):
    summary = run(pipeline, "https://tokopedia.com", "Belanja online mudah dan terpercaya")
    assert summary["indication"] == "Rendah"
    assert summary["overall_score"] < config.indication_medium_threshold


def test_one_weak_signal_is_sedang(pipeline):
    summary = run(pipeline, "https://slot-machine-repair.com")
    assert summary["indication"] == "Sedang"


def test_hung_detector_times_out_without_blocking_others(monkeypatch):
    class HangingText:
        def detect(self, text, timeout=None):
            time.sleep(3)

    monkeypatch.setattr(config, "text_keyword_timeout", 0.2)
    monkeypatch.setattr(config, "url_pattern_timeout", 0.2)
    monkeypatch.setattr(config, "ocr_timeout", 0.2)
    monkeypatch.setattr(config, "visual_similarity_timeout", 0.2)

    pipeline = DetectionPipeline(text_detector=HangingText())
    started = time.monotonic()
    outcome = pipeline.run_all(
        DetectionInput(url="https://togelonline.id", scraped={"page_text": "slot"}))
    elapsed = time.monotonic() - started

    assert elapsed < 2.5, "pipeline waited for the hung detector"
    text = outcome.get_detector_result(DetectorType.TEXT_KEYWORD)
    assert text.status == DetectionStatus.FAILED and text.label == "Timeout"
    url = outcome.get_detector_result(DetectorType.URL_PATTERN)
    assert url.status == DetectionStatus.OK and url.label == "High Risk Pattern"
