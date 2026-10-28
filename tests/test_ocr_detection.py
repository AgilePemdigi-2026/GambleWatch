"""DET-03: OCR on a screenshot, scored by DET-04.

Needs the Tesseract program installed (see docs/INSTALL_TESSERACT.md);
the real-OCR tests are skipped when it is missing.
"""

from io import BytesIO

import pytest
from PIL import Image, ImageDraw, ImageFont

from detection_engine.detectors.det03_ocr.ocr_detector import OCRDetector
from detection_engine.models.detection_models import DetectionStatus


def render_text(lines, size=40) -> bytes:
    """Draw black text on white, like a plain page screenshot."""
    try:
        font = ImageFont.truetype("arial.ttf", size)
    except OSError:
        font = ImageFont.load_default(size)
    image = Image.new("RGB", (1100, 90 * len(lines) + 40), "white")
    draw = ImageDraw.Draw(image)
    for i, line in enumerate(lines):
        draw.text((30, 30 + i * 90), line, fill="black", font=font)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


@pytest.fixture(scope="module")
def detector():
    return OCRDetector()


@pytest.fixture(scope="module")
def tesseract(detector):
    if not detector._tesseract_ready():
        pytest.skip("Tesseract tidak terpasang")


def test_missing_tesseract_fails_with_clear_message(detector):
    if detector._tesseract_ready():
        pytest.skip("Tesseract terpasang; jalur error tidak bisa diuji")
    result = detector.detect(render_text(["SLOT GACOR"]))
    assert result.status == DetectionStatus.FAILED
    assert "Tesseract" in result.error.details["error"]


def test_gambling_screenshot_is_flagged(detector, tesseract):
    result = detector.detect(render_text([
        "SITUS JUDI SLOT GACOR",
        "Bonus new member 100 persen",
    ]))
    assert result.status == DetectionStatus.OK
    assert result.label == "OCR Flagged"
    assert result.score >= 0.6


def test_normal_screenshot_is_clear(detector, tesseract):
    result = detector.detect(render_text([
        "Belanja online mudah dan terpercaya",
        "Gratis ongkir ke seluruh Indonesia",
    ]))
    assert result.status == DetectionStatus.OK
    assert result.label == "Clear"


def test_blank_image_is_clear(detector, tesseract):
    buffer = BytesIO()
    Image.new("RGB", (400, 300), "white").save(buffer, format="PNG")
    result = detector.detect(buffer.getvalue())
    assert result.status == DetectionStatus.OK
    assert result.score == 0.0
