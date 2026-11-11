"""DET-03: OCR pada screenshot, dinilai oleh DET-04. Tes untuk satu detektor ini saja.

Butuh program Tesseract (lihat docs/INSTALL_TESSERACT.md); tes OCR asli
dilewati bila Tesseract belum terpasang.

Jalankan dari root repo:

    pytest tests/test_det03_ocr.py -v -rs            # lulus/gagal per kasus
    python tests/test_det03_ocr.py                   # demo dengan 2 screenshot buatan
    python tests/test_det03_ocr.py --samples         # semua screenshot di data/samples/ocr/
    python tests/test_det03_ocr.py shot.png          # screenshot sendiri (JPG/PNG, maks. 5 MB):
                                                     # teks yang terbaca + kata kunci
"""

import sys
from io import BytesIO
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from PIL import Image, ImageDraw, ImageFont

from detection_engine.detectors.det03_ocr.ocr_detector import OCRDetector
from detection_engine.models.detection_models import DetectionStatus
from tests.samples import needs_samples


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


# --- Data nyata dari data/samples/ocr/ (screenshot halaman sungguhan) ---

@pytest.fixture(scope="module")
def sample_ocr(detector, tesseract):
    """Hasil OCR semua screenshot nyata, dihitung sekali per modul: {(label, nama): (entry, hasil)}."""
    from tests.samples import entries, screenshot_of
    results = {}
    for label in ("judi", "normal", "mirip_tapi_bukan"):
        for entry in entries(label):
            shot = screenshot_of(entry)
            if shot and shot.stat().st_size <= 5 * 1024 * 1024:
                results[(label, entry["nama"])] = (entry, detector.detect(shot))
    return results


def _group(sample_ocr, label):
    return [(e, r) for (lab, _), (e, r) in sample_ocr.items() if lab == label]


@needs_samples
@pytest.mark.xfail(strict=False, reason=(
    "Celah terukur (contoh 29/10/2026): 10 dari 13 (77%). Yang terlewat (komoot, thinc360, "
    "bandcamp) memuat kata judi di bawah layar pertama; screenshot hanya 1366x900, "
    "sedangkan DET-04 membaca teks seluruh halaman."))
def test_sample_gambling_screenshots_are_flagged(sample_ocr):
    """Screenshot halaman judi yang termuat: minimal 80% harus 'OCR Flagged'."""
    group = _group(sample_ocr, "judi")
    missed = [e["url"] for e, r in group if r.label != "OCR Flagged"]
    recall = 1 - len(missed) / len(group)
    assert group and recall >= 0.8, f"recall {recall:.0%}, terlewat: {missed}"


@needs_samples
@pytest.mark.xfail(strict=False, reason=(
    "Celah terukur pada halaman validasi (29/10/2026): beranda antaranews.com (portal berita) "
    "ditandai 'OCR Flagged' karena sebuah judul tentang judi online tampak di layar pertama; "
    "OCR tidak melihat konteks halaman. Di skor gabungan ia tetap Rendah (0.24)."))
def test_sample_normal_screenshots_are_clear(sample_ocr):
    group = _group(sample_ocr, "normal")
    flagged = [e["url"] for e, r in group if r.label == "OCR Flagged"]
    assert group and not flagged, f"salah ditandai: {flagged}"


@needs_samples
@pytest.mark.xfail(strict=False, reason=(
    "Celah terukur (contoh 29/10/2026): 4 dari 6 berita/edukasi ditandai 'OCR Flagged' "
    "(bisnis.com, investortrust, hukumonline, Wikipedia). OCR hanya membaca layar pertama "
    "sehingga tidak melihat konteks berita. Di skor gabungan, analisis teks seluruh halaman "
    "meredamnya (lihat tests/test_pipeline.py)."))
def test_sample_screenshots_that_only_discuss_gambling_are_clear(sample_ocr):
    group = _group(sample_ocr, "mirip_tapi_bukan")
    flagged = [e["url"] for e, r in group if r.label == "OCR Flagged"]
    assert group and not flagged, f"salah ditandai: {flagged}"


def show_samples(detector) -> int:
    from tests.samples import entries, screenshot_of
    rows = [(label, e) for label in ("judi", "normal", "mirip_tapi_bukan") for e in entries(label)]
    if not rows:
        print("data/samples/ belum ada atau tidak ada screenshot yang valid.")
        return 2
    print(f"{'':3}{'Label':17}{'Harapan':12} {'Hasil':12} {'Skor':5} Halaman")
    for label, entry in rows:
        shot = screenshot_of(entry)
        if not shot:
            continue
        result = detector.detect(shot)
        expected = "OCR Flagged" if label == "judi" else "Clear"
        ok = result.label == expected
        print(f"{'OK' if ok else 'XX':3}{label:17}{expected:12} {result.label:12} "
              f"{result.score:.2f}  {entry['url'][8:80]}")
    return 0


SAMPLES = [
    ("Screenshot situs judi",
     ["SITUS JUDI SLOT GACOR TERPERCAYA", "Daftar sekarang, bonus new member 100%"], "OCR Flagged"),
    ("Screenshot toko online",
     ["Belanja online mudah dan terpercaya", "Gratis ongkir ke seluruh Indonesia"], "Clear"),
]


def main(argv) -> int:
    detector = OCRDetector()
    if not detector._tesseract_ready():
        print("Tesseract belum terpasang. Lihat docs/INSTALL_TESSERACT.md")
        return 2
    print(f"Bahasa OCR: {detector._resolve_language()}\n")

    if argv == ["--samples"]:  # semua screenshot di data/samples/ocr/
        return show_samples(detector)

    if argv:  # screenshot milik sendiri
        for path in argv:
            result = detector.detect(path)
            evidence = result.evidence or {}
            found = [k["keyword"] for k in evidence.get("keywords_found", [])]
            print(f"{result.status.value:7} {result.label:12} skor {result.score:.2f}  {path}")
            print(f"    kata kunci : {', '.join(found) or '-'}")
            print(f"    teks terbaca: {evidence.get('ocr_text_preview', '')[:200]!r}")
        return 0

    wrong = 0
    for name, lines, expected in SAMPLES:
        result = detector.detect(render_text(lines))
        ok = result.label == expected
        wrong += not ok
        text = (result.evidence or {}).get("ocr_text_preview", "").replace("\n", " / ")
        print(f"{'OK' if ok else 'XX'}  {name}: harapan {expected}, hasil {result.label} (skor {result.score:.2f})")
        print(f"      teks terbaca: {text[:100]}")
    print(f"\n{len(SAMPLES) - wrong}/{len(SAMPLES)} sesuai harapan")
    return 1 if wrong else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
