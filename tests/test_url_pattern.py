"""Regression tests for DET-01 URL pattern scoring."""

import pytest

from detection_engine.detectors.url_pattern.url_pattern_detector import URLPatternDetector

HIGH_RISK = [
    "https://slotgacor88.bet",
    "https://togelonline.id",
    "https://judi.com",
    "https://bola-slot.xyz",
    "https://situs-slot777.com",
    "https://sbobet.com",
    "https://bandar-togel-resmi.net",
    "https://casino-royale.win",
    "https://example.com/slot/daftar",
]

NORMAL = [
    "https://google.com",
    "https://tokopedia.com",
    "https://classroom.google.com",
    "https://alphabet.com",
    "https://bandarlampung.go.id",
    "https://ayampotong.co.id",
    "https://kompas.com/bola/liga-1",
    "https://togel.go.id",
]


@pytest.fixture(scope="module")
def detector():
    return URLPatternDetector()


@pytest.mark.parametrize("url", HIGH_RISK)
def test_gambling_urls_are_high_risk(detector, url):
    result = detector.detect(url)
    assert result.label == "High Risk Pattern", f"{url} scored {result.score:.2f}"


@pytest.mark.parametrize("url", NORMAL)
def test_legitimate_urls_are_normal(detector, url):
    result = detector.detect(url)
    assert result.label == "Normal", f"{url} scored {result.score:.2f}"
