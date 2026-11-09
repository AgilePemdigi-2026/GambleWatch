"""DET-04: analisis teks/kata kunci. Tes untuk satu detektor ini saja.

Jalankan dari root repo:

    pytest tests/test_det04_text_keyword.py -v       # lulus/gagal per contoh
    python tests/test_det04_text_keyword.py          # tabel contoh bawaan
    python tests/test_det04_text_keyword.py --samples     # semua teks di data/samples/
    python tests/test_det04_text_keyword.py "teks anda"   # teks sendiri, dengan
                                                          # kata kunci yang ditemukan
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest

from detection_engine.detectors.det04_text_keyword.text_keyword_detector import TextKeywordDetector
from detection_engine.detectors.det04_text_keyword.text_normalizer import TextNormalizer
from tests.samples import entries, needs_samples, text_of


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


GAMBLING_TEXTS = [
    "Slot online gacor dengan bonus deposit 100%",
    "Judi online terpercaya",
    "Togel online dengan prediksi",
    "S1ot g4cor m4xw1n",
    "Daftar slot88 sekarang, bonus new member 100 persen",
    "Free spin dan casino terbaik",
]

NORMAL_TEXTS = [
    "Belanja online mudah dan terpercaya",
    "Booking hotel dan tiket pesawat",
    "Alphabet inc adalah perusahaan induk Google",   # "bet" inside a word
    "Pertandingan bola semalam sangat seru",         # one ambiguous word
]


@pytest.mark.parametrize("text", GAMBLING_TEXTS)
def test_gambling_text_is_flagged(detector, text):
    result = detector.detect(text)
    assert result.label == "Keywords Found", f"{text!r} scored {result.score:.2f}"
    assert result.score >= 0.6


@pytest.mark.parametrize("text", NORMAL_TEXTS)
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


# --- Konteks: situs judi menjual judi, berita hanya membahasnya ---

NEWS = ("Polisi menangkap tersangka kasus judi online. Komdigi memblokir ribuan situs judi. "
        "OJK mengimbau masyarakat waspada terhadap bahaya judi dan dampak kecanduan judi. ") * 3

PROMO = ("Daftar slot gacor maxwin hari ini, bonus new member 100%, deposit pulsa "
         "tanpa potongan, link alternatif terbaru.")


def test_news_about_gambling_is_not_flagged(detector):
    result = detector.detect(NEWS)
    assert result.label == "No Keywords"
    assert result.evidence["context"] == "informational"
    assert result.evidence["keywords_found"], "kata kunci tetap dicatat sebagai bukti"


def test_gambling_page_is_flagged_as_promotional(detector):
    result = detector.detect(PROMO)
    assert result.label == "Keywords Found"
    assert result.evidence["context"] == "promotional"


def test_promotional_wording_beats_news_wording(detector):
    """Halaman judi yang menyelipkan kata berita tetap harus ditandai."""
    result = detector.detect(PROMO + " Berita: polisi, Komdigi, dan OJK memblokir situs.")
    assert result.label == "Keywords Found"


def test_one_passing_mention_on_a_long_page_is_incidental(detector):
    page = "Selamat datang di toko kami, silakan pilih produk. " * 120   # > 3000 huruf
    result = detector.detect(page + " Ada taruhan kecil di akhir.")
    assert result.label == "No Keywords"
    assert result.evidence["context"] == "incidental"


def test_many_mentions_on_a_long_page_are_not_incidental(detector):
    page = "Selamat datang di toko kami, silakan pilih produk. " * 120
    result = detector.detect(page + " slot gacor slot gacor slot gacor")
    assert result.label == "Keywords Found"


def test_a_related_word_is_not_a_fuzzy_match(detector):
    """'dipertaruhkan' (at stake) berkerabat dengan 'taruhan' tetapi bukan judi."""
    text = "Karier dan mimpi ikut dipertaruhkan dalam laga penentuan juara liga musim ini di stadion utama."
    assert detector.detect(text).label == "No Keywords"


def test_a_one_letter_typo_is_still_caught(detector):
    text = "Daftar taruhn online terpercaya dengan layanan pelanggan dua puluh empat jam setiap hari."
    result = detector.detect(text)
    assert result.label == "Keywords Found"
    assert "fuzzy" in result.evidence["keywords_found"][0]["match_types"]


def test_sports_slang_gacor_is_not_gambling(detector):
    text = "Striker muda itu tampil gacor di laga semalam dan bola masuk dua kali ke gawang lawan."
    assert detector.detect(text).label == "No Keywords"


def test_ambiguous_words_together_never_flag(detector):
    result = detector.detect("bola ayam bandar odds stakes domino gacor " * 4)
    assert result.label == "No Keywords"
    assert result.evidence["context"] == "weak"


def test_gacor_next_to_a_real_gambling_keyword_is_still_flagged(detector):
    assert detector.detect("Slot gacor hari ini, daftar sekarang").label == "Keywords Found"


def test_repeating_an_ambiguous_word_adds_no_evidence(detector):
    """Situs sepak bola menyebut 'bola' berulang kali; itu bukan judi."""
    assert detector.detect("Jadwal bola hari ini. " * 15).label == "No Keywords"


# --- Data nyata dari data/samples/ (teks halaman yang diambil dengan browser) ---

@needs_samples
def test_sample_gambling_pages_are_flagged(detector):
    """Halaman judi yang benar-benar termuat: minimal 90% harus 'Keywords Found'."""
    pages = entries("judi")
    missed = [p["url"] for p in pages if detector.detect(text_of(p)).label != "Keywords Found"]
    recall = 1 - len(missed) / len(pages)
    assert pages and recall >= 0.9, f"recall {recall:.0%}, terlewat: {missed}"


@needs_samples
def test_sample_normal_pages_are_not_flagged(detector):
    """Situs biasa tidak boleh ditandai."""
    pages = entries("normal")
    flagged = [p["url"] for p in pages if detector.detect(text_of(p)).label == "Keywords Found"]
    assert pages and not flagged, f"salah ditandai: {flagged}"


@needs_samples
@pytest.mark.xfail(strict=False, reason=(
    "Celah terukur (contoh 29/10/2026): 5 dari 6 benar. Sisanya id.wikipedia.org/wiki/Perjudian, "
    "artikel ensiklopedis yang menguraikan semua jenis judi (judi, taruhan, togel, kasino, "
    "poker, domino) dengan hanya 2 kata informasi, sehingga tidak terbaca 'informasional'."))
def test_sample_pages_that_only_discuss_gambling_are_not_flagged(detector):
    """Berita dan edukasi tentang judi online bukan situs judi."""
    pages = entries("mirip_tapi_bukan")
    flagged = [p["url"] for p in pages if detector.detect(text_of(p)).label == "Keywords Found"]
    assert pages and not flagged, f"salah ditandai: {flagged}"


def show_samples(detector) -> int:
    pages = [p for label in ("judi", "normal", "mirip_tapi_bukan") for p in entries(label)]
    if not pages:
        print("data/samples/ belum ada atau tidak ada halaman yang valid.")
        return 2
    print(f"{'':3}{'Label':17}{'Harapan':14} {'Hasil':14} {'Skor':5} Halaman")
    for p in pages:
        result = detector.detect(text_of(p))
        expected = "Keywords Found" if p["label"] == "judi" else "No Keywords"
        ok = result.label == expected
        print(f"{'OK' if ok else 'XX':3}{p['label']:17}{expected:14} {result.label:14} "
              f"{result.score:.2f}  {p['url'][8:80]}")
    return 0


def main(argv) -> int:
    detector = TextKeywordDetector()

    if argv == ["--samples"]:  # semua halaman di data/samples/
        return show_samples(detector)

    if argv:  # teks milik sendiri
        for text in argv:
            result = detector.detect(text)
            found = [k["keyword"] for k in (result.evidence or {}).get("keywords_found", [])]
            print(f"{result.label:14} skor {result.score:.2f}  kata kunci: {', '.join(found) or '-'}")
            print(f"    dibaca sebagai: {detector.normalizer.normalize_variants(text)[0]!r}")
        return 0

    print(f"{'':3}{'Harapan':14} {'Hasil':14} {'Skor':5} Teks")
    wrong = 0
    for expected, texts in (("Keywords Found", GAMBLING_TEXTS), ("No Keywords", NORMAL_TEXTS)):
        for text in texts:
            result = detector.detect(text)
            ok = result.label == expected
            wrong += not ok
            print(f"{'OK' if ok else 'XX':3}{expected:14} {result.label:14} {result.score:.2f}  {text}")
    total = len(GAMBLING_TEXTS) + len(NORMAL_TEXTS)
    print(f"\n{total - wrong}/{total} sesuai harapan")
    return 1 if wrong else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
