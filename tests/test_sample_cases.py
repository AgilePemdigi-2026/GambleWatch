"""Contoh kasus uji untuk seluruh mesin deteksi, berdasarkan PRD GambleWatch.

Satu file berisi contoh URL, teks, dan gambar beserta HASIL YANG DIINGINKAN.

Dua cara memakainya (jalankan dari root repo):

    pytest tests/test_sample_cases.py -v      # lulus/gagal per kasus
    python tests/test_sample_cases.py         # tabel harapan vs hasil

Aturan PRD yang dijadikan patokan:
  1. Hasil berupa tingkat Rendah / Sedang / Tinggi + skor probabilitas, dan
     memuat skor URL Pattern, Visual Similarity, OCR, dan Keyword Analysis.
  2. Laporan berindikasi TINGGI masuk antrean verifikasi admin. Kasus yang
     meragukan harus SEDANG (ditinjau admin), jangan dilepas sebagai Rendah:
     sistem hanya menyaring, admin yang memutuskan.
  3. Input: URL http/https, atau gambar JPG/PNG maksimal 5 MB.
  4. Satu modul gagal atau dilewati (scraping diblokir, OCR tidak tersedia,
     indeks visual belum ada) tidak boleh menggagalkan hasil keseluruhan.
"""

import sys
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Optional

# Supaya file ini juga bisa dijalankan langsung: python tests/test_sample_cases.py
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from PIL import Image, ImageDraw, ImageFont

from detection_engine.detectors.det02_visual_similarity import (
    ReferenceIndex, VisualSimilarityDetector,
)
from detection_engine.detectors.det03_ocr.ocr_detector import OCRDetector
from detection_engine.models.detection_models import DetectionInput
from detection_engine.pipeline import DetectionPipeline
from detection_engine.validation.input_validator import InputValidator

MODULES = {"url_pattern", "visual_similarity", "ocr", "keyword_analysis"}


# ---------------------------------------------------------------------------
# 1. URL + teks halaman (hasil scraping)  ->  tingkat indikasi
# ---------------------------------------------------------------------------

@dataclass
class Case:
    name: str
    url: Optional[str]
    text: str
    expected: str          # "Tinggi" | "Sedang" | "Rendah"
    why: str               # alasan menurut PRD
    known_gap: str = ""    # diisi bila mesin BELUM memenuhi harapan ini (xfail)


CASES = [
    # --- TINGGI: harus masuk antrean verifikasi admin -----------------------
    Case("URL + teks judi jelas", "https://slotgacor88.bet",
         "Daftar slot gacor, bonus new member 100%", "Tinggi",
         "domain .bet + kata slot/gacor + promo"),
    Case("Hanya URL: togel", "https://togelonline.id", "", "Tinggi",
         "kata 'togel' di domain cukup sebagai bukti kuat"),
    Case("Hanya URL: judi", "https://judi.com", "", "Tinggi",
         "kata 'judi' di domain"),
    Case("Hanya URL: merek judi", "https://sbobet.com", "", "Tinggi",
         "merek judi dikenal"),
    Case("URL angka khas judi", "https://situs-slot777.com",
         "Main slot maxwin", "Tinggi", "pola slot+angka dan kata maxwin"),
    Case("Domain netral, teks judi (leetspeak)", "https://promo-hoki.xyz",
         "S1ot g4cor m4xw1n, d3p0sit 10rb", "Tinggi",
         "penyamaran huruf harus tetap terbaca"),
    Case("Domain netral, huruf berspasi", "https://info-hoki.xyz",
         "s l o t  g a c o r terpercaya, bonus new member", "Tinggi",
         "huruf dipisah spasi harus disatukan"),
    Case("Domain netral, teks kasino", "https://info-hoki.xyz",
         "Situs judi online terpercaya, casino dan togel", "Tinggi",
         "beberapa kata kunci judi sekaligus"),

    # --- SEDANG: meragukan, perlu dinilai admin -----------------------------
    Case("Satu kata ambigu di domain", "https://slot-machine-repair.com", "",
         "Sedang", "'slot' saja bisa berarti mesin/jadwal; admin yang menilai"),
    Case("Kata ambigu di teks", "https://kalender-kantor.com",
         "Cari time slot kosong untuk rapat", "Sedang",
         "'slot' dalam arti jadwal; jangan dilepas sebagai Rendah"),

    # --- RENDAH: situs wajar -----------------------------------------------
    Case("Situs e-commerce", "https://tokopedia.com",
         "Belanja online mudah dan terpercaya", "Rendah", "tidak ada indikasi"),
    Case("Mesin pencari", "https://google.com", "Cari informasi di internet",
         "Rendah", "tidak ada indikasi"),
    Case("Situs berita", "https://detik.com", "", "Rendah", "tidak ada indikasi"),
    Case("Domain pemerintah dengan kata 'bandar'",
         "https://bandarlampung.go.id", "Pemerintah Kota Bandar Lampung",
         "Rendah", "nama kota; domain .go.id sangat jarang situs judi"),
    Case("Kampus", "https://ui.ac.id", "Universitas Indonesia", "Rendah",
         "domain .ac.id"),
    Case("Kata 'bet' di dalam kata lain", "https://alphabet.com",
         "Alphabet inc adalah perusahaan induk Google", "Rendah",
         "'bet' di 'alphabet' bukan taruhan"),
    Case("Berita olahraga biasa", "https://kompas.com/bola/liga-1",
         "Hasil pertandingan semalam", "Rendah",
         "kata 'bola' di path berita bukan judi"),
    Case("Artikel ensiklopedia tentang poker", "https://en.wikipedia.org/wiki/Poker",
         "Poker is a family of card games", "Rendah",
         "artikel informatif, bukan situs judi",
         known_gap="deteksi berbasis kata kunci tidak bisa membedakan artikel "
                   "tentang poker dari situs poker; saat ini hasilnya Tinggi"),
]


def run_pipeline(url, text="", screenshot=None, pipeline=None):
    pipeline = pipeline or DetectionPipeline()
    data = DetectionInput(url=url, screenshot=screenshot,
                          scraped={"page_text": text})
    return pipeline.get_summary(pipeline.run_all(data))


@pytest.fixture(scope="module")
def pipeline():
    return DetectionPipeline()


@pytest.mark.parametrize("case", [
    pytest.param(c, id=c.name,
                 marks=pytest.mark.xfail(reason=c.known_gap, strict=False)
                 if c.known_gap else ())
    for c in CASES
])
def test_expected_indication(pipeline, case):
    summary = run_pipeline(case.url, case.text, pipeline=pipeline)
    assert summary["indication"] == case.expected, (
        f"{case.name}: harapan {case.expected}, hasil {summary['indication']} "
        f"(skor {summary['overall_score']:.2f}). Alasan harapan: {case.why}")


# ---------------------------------------------------------------------------
# 2. Bentuk hasil sesuai PRD: skor probabilitas + keempat modul
# ---------------------------------------------------------------------------

def test_result_contains_everything_the_prd_requires(pipeline):
    summary = run_pipeline("https://togelonline.id", "Prediksi togel hari ini",
                           pipeline=pipeline)
    assert summary["indication"] in {"Rendah", "Sedang", "Tinggi"}
    assert 0.0 <= summary["overall_score"] <= 1.0
    assert set(summary["modules"]) == MODULES
    for name, module in summary["modules"].items():
        assert {"status", "label", "score"} <= set(module), name
        assert 0.0 <= module["score"] <= 1.0, name


def test_more_evidence_never_lowers_the_score(pipeline):
    weak = run_pipeline("https://info-hoki.xyz", "slot", pipeline=pipeline)
    strong = run_pipeline("https://info-hoki.xyz", "slot gacor maxwin jackpot",
                          pipeline=pipeline)
    assert strong["overall_score"] >= weak["overall_score"]


# ---------------------------------------------------------------------------
# 3. Validasi input (PRD: URL http/https, gambar JPG/PNG maks. 5 MB)
# ---------------------------------------------------------------------------

def png_bytes(size=(64, 64)) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", size, "white").save(buffer, format="PNG")
    return buffer.getvalue()


def image_bytes(fmt: str) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (64, 64), "white").save(buffer, format=fmt)
    return buffer.getvalue()


# Data gambar dibuat saat tes berjalan (lambda), bukan dijadikan parameter,
# supaya pytest tidak mencetak isi byte sebagai nama tes.
VALIDATION_CASES = [
    ("URL https biasa", "https://example.com", lambda: None, True),
    ("URL http biasa", "http://example.com/halaman", lambda: None, True),
    ("PNG valid", None, png_bytes, True),
    ("JPEG valid", None, lambda: image_bytes("JPEG"), True),
    ("URL + gambar sekaligus", "https://example.com", png_bytes, True),
    ("Tanpa input sama sekali", None, lambda: None, False),
    ("GIF ditolak", None, lambda: image_bytes("GIF"), False),
    ("WEBP ditolak", None, lambda: image_bytes("WEBP"), False),
    ("Bukan gambar", None, lambda: b"ini bukan gambar", False),
]


@pytest.mark.parametrize("label, url, make_screenshot, valid", VALIDATION_CASES,
                         ids=[c[0] for c in VALIDATION_CASES])
def test_input_validation(label, url, make_screenshot, valid):
    data = DetectionInput(url=url, screenshot=make_screenshot())
    ok, message = InputValidator().validate_input(data)
    assert ok is valid, label
    if not valid:
        assert message, "pesan error (Bahasa Indonesia) harus ada"


def test_image_over_5_mb_is_rejected():
    too_big = b"\xff\xd8" + b"0" * (6 * 1024 * 1024)
    with pytest.raises(ValueError):
        DetectionInput(screenshot=too_big)


@pytest.mark.parametrize("url", ["ftp://example.com/file", "javascript:alert(1)",
                                 "file:///etc/passwd", "example.com"])
def test_non_http_urls_are_rejected(url):
    with pytest.raises(ValueError):
        DetectionInput(url=url)


# ---------------------------------------------------------------------------
# 4. Gambar: Visual Similarity (DET-02) dan OCR (DET-03)
# ---------------------------------------------------------------------------

def site_screenshot(layout: int) -> bytes:
    """'Screenshot' sintetis; tiap layout punya pHash berbeda."""
    image = Image.new("RGB", (640, 480), "white")
    draw = ImageDraw.Draw(image)
    if layout == 0:
        draw.rectangle((0, 0, 640, 90), fill="navy")
        draw.rectangle((40, 140, 300, 420), fill="gold")
        draw.ellipse((360, 160, 600, 400), fill="crimson")
    else:
        draw.rectangle((0, 0, 320, 480), fill="teal")
        draw.rectangle((380, 100, 600, 160), fill="orange")
        draw.ellipse((400, 260, 560, 420), fill="black")
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=55)   # simulasi hasil kompresi
    return buffer.getvalue()


@pytest.fixture
def visual_pipeline(tmp_path):
    """Pipeline dengan indeks referensi berisi satu situs judi (layout 0)."""
    index = ReferenceIndex()
    index.add(Image.open(BytesIO(site_screenshot(0))), {"id": "situs-judi-a"})
    path = tmp_path / "index.npz"
    index.save(path)
    return DetectionPipeline(visual_detector=VisualSimilarityDetector(index_path=path))


def test_screenshot_matching_known_gambling_site_is_tinggi(visual_pipeline):
    """Domain netral, tapi tampilan sama dengan situs judi yang dikenal."""
    summary = run_pipeline("https://halaman-biasa.com", screenshot=site_screenshot(0),
                           pipeline=visual_pipeline)
    assert summary["modules"]["visual_similarity"]["label"].startswith("Visual Match")
    assert summary["indication"] == "Tinggi"


def test_unrelated_screenshot_is_rendah(visual_pipeline):
    summary = run_pipeline("https://halaman-biasa.com", screenshot=site_screenshot(1),
                           pipeline=visual_pipeline)
    assert summary["modules"]["visual_similarity"]["label"] == "No Visual Match"
    assert summary["indication"] == "Rendah"


def test_failed_or_skipped_modules_do_not_break_the_result():
    """Tanpa indeks visual dan mungkin tanpa Tesseract, URL tetap menentukan."""
    pipeline = DetectionPipeline(
        visual_detector=VisualSimilarityDetector(index_path="tidak/ada.npz"))
    summary = run_pipeline("https://togelonline.id", screenshot=png_bytes(),
                           pipeline=pipeline)
    assert summary["modules"]["visual_similarity"]["status"] == "skipped"
    assert summary["modules"]["ocr"]["status"] in {"ok", "failed", "skipped"}
    assert summary["indication"] == "Tinggi"


def render_text(lines) -> bytes:
    try:
        font = ImageFont.truetype("arial.ttf", 40)
    except OSError:
        font = ImageFont.load_default(40)
    image = Image.new("RGB", (1100, 90 * len(lines) + 40), "white")
    draw = ImageDraw.Draw(image)
    for i, line in enumerate(lines):
        draw.text((30, 30 + i * 90), line, fill="black", font=font)
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


needs_tesseract = pytest.mark.skipif(
    not OCRDetector()._tesseract_ready(), reason="Tesseract belum terpasang")


@needs_tesseract
def test_gambling_text_in_screenshot_is_tinggi():
    shot = render_text(["SITUS JUDI SLOT GACOR", "Bonus new member 100 persen"])
    summary = run_pipeline("https://halaman-biasa.com", screenshot=shot)
    assert summary["modules"]["ocr"]["label"] == "OCR Flagged"
    assert summary["indication"] == "Tinggi"


@needs_tesseract
def test_normal_text_in_screenshot_is_rendah():
    shot = render_text(["Belanja online mudah dan terpercaya", "Gratis ongkir"])
    summary = run_pipeline("https://halaman-biasa.com", screenshot=shot)
    assert summary["modules"]["ocr"]["label"] == "Clear"
    assert summary["indication"] == "Rendah"


# ---------------------------------------------------------------------------
# Mode tabel: python tests/test_sample_cases.py
# ---------------------------------------------------------------------------

def main() -> int:
    pipeline = DetectionPipeline()
    print(f"{'Contoh':42} {'Harapan':8} {'Hasil':8} {'Skor':5} URL / teks")
    print("-" * 110)
    wrong = 0
    for case in CASES:
        summary = run_pipeline(case.url, case.text, pipeline=pipeline)
        ok = summary["indication"] == case.expected
        gap = not ok and bool(case.known_gap)
        wrong += not ok and not gap
        mark = "OK " if ok else ("GAP" if gap else "XX ")
        print(f"{mark}{case.name[:39]:39} {case.expected:8} {summary['indication']:8} "
              f"{summary['overall_score']:.2f}  {case.url} | {case.text[:35]}")
    print("-" * 110)
    gaps = [c for c in CASES if c.known_gap]
    print(f"{len(CASES) - wrong - len(gaps)}/{len(CASES)} sesuai harapan PRD"
          f", {len(gaps)} celah diketahui (GAP), {wrong} salah (XX)")
    for c in gaps:
        print(f"  GAP: {c.name}: {c.known_gap}")
    return 1 if wrong else 0


if __name__ == "__main__":
    sys.exit(main())
