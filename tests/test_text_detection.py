"""DET-04: text normalization and keyword detection."""

import pytest

from detection_engine.detectors.text_keyword.text_keyword_detector import TextKeywordDetector
from detection_engine.text.text_normalizer import TextNormalizer


@pytest.fixture(scope="module")
def normalizer():
    return TextNormalizer()


@pytest.fixture(scope="module")
def detector():
    return TextKeywordDetector()


@pytest.mark.parametrize("raw, expected", [
    ("S1ot G4cor", "slot gacor"),                  # 1 read as 'l' in the 2nd variant
    ("M4xw1n", "maxwin"),                          # 1 read as 'i' in the 1st variant
    ("s l o t g a c o r", "slotgacor"),            # spaced-out letters rejoined
    ("ⓢⓛⓞⓣ online", "slot online"),                # circled letters
    ("ＳＬＯＴ", "slot"),                            # full-width letters (NFKC)
])
def test_normalizer_undoes_disguises(normalizer, raw, expected):
    assert expected in normalizer.normalize_variants(raw)


@pytest.mark.parametrize("raw", [
    "Daftar slot88 tahun 2024 hub 0812",
    "Harga Rp 100.000 per 25 Desember",
])
def test_normalizer_keeps_numbers(normalizer, raw):
    """Standalone and trailing numbers must not be turned into letters."""
    normalized = normalizer.normalize(raw)
    for token in raw.lower().split():
        if token.isdigit() or token.startswith("slot88"):
            assert token in normalized


@pytest.mark.parametrize("text", [
    "Slot online gacor dengan bonus deposit 100%",
    "Judi online terpercaya",
    "Togel online dengan prediksi",
    "S1ot g4cor m4xw1n",
    "Daftar slot88 sekarang, bonus new member 100 persen",
    "Free spin dan casino terbaik",
])
def test_gambling_text_is_flagged(detector, text):
    result = detector.detect(text)
    assert result.label == "Keywords Found", f"{text!r} scored {result.score:.2f}"
    assert result.score >= 0.6


@pytest.mark.parametrize("text", [
    "Belanja online mudah dan terpercaya",
    "Booking hotel dan tiket pesawat",
    "Alphabet inc adalah perusahaan induk Google",   # "bet" inside a word
    "Pertandingan bola semalam sangat seru",         # one ambiguous word
])
def test_normal_text_is_not_flagged(detector, text):
    result = detector.detect(text)
    assert result.label == "No Keywords", f"{text!r} scored {result.score:.2f}"


def test_keyword_listed_in_two_languages_counts_once(detector):
    """'slot' exists as both an id and en keyword; one mention is one signal."""
    result = detector.detect("Cari time slot kosong untuk rapat")
    assert 0.5 < result.score < 0.75


def test_more_keywords_raise_the_score(detector):
    one = detector.detect("slot")
    many = detector.detect("slot gacor maxwin jackpot")
    assert many.score > one.score
    assert many.score <= 1.0


def test_empty_text_is_skipped(detector):
    assert detector.detect("   ").status.value == "skipped"
