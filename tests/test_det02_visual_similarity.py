"""DET-02: kemiripan visual dengan indeks referensi (pHash). Tes untuk satu detektor ini saja.

Jalankan dari root repo:

    pytest tests/test_det02_visual_similarity.py -v   # lulus/gagal per kasus
    python tests/test_det02_visual_similarity.py --samples   # screenshot nyata di data/samples/
    python tests/test_det02_visual_similarity.py      # demo dengan indeks sementara
                                                      # berisi 2 "situs judi" buatan
    python tests/test_det02_visual_similarity.py shot.png
        # screenshot sendiri, dibandingkan dengan indeks asli data/reference_index.npz
        # (buat dulu: python scripts/build_reference_index.py --image-dir <folder>)
"""

import sys
import tempfile
from io import BytesIO
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from PIL import Image, ImageDraw

from detection_engine.detectors.det02_visual_similarity import ReferenceIndex, VisualSimilarityDetector
from detection_engine.models.detection_models import DetectionStatus
from tests.samples import needs_samples


def make_site_screenshot(layout: int) -> Image.Image:
    """Synthetic 'screenshot': distinct block layouts give distinct pHashes."""
    image = Image.new("RGB", (640, 480), "white")
    draw = ImageDraw.Draw(image)
    if layout == 0:
        draw.rectangle((0, 0, 640, 90), fill="navy")
        draw.rectangle((40, 140, 300, 420), fill="gold")
        draw.ellipse((360, 160, 600, 400), fill="crimson")
    elif layout == 1:
        draw.rectangle((0, 380, 640, 480), fill="black")
        draw.ellipse((40, 40, 240, 240), fill="green")
        draw.rectangle((320, 60, 600, 200), fill="purple")
    else:
        draw.rectangle((0, 0, 320, 480), fill="teal")
        draw.rectangle((380, 100, 600, 160), fill="orange")
        draw.ellipse((400, 260, 560, 420), fill="black")
    return image


def to_jpeg(image: Image.Image, quality: int = 60, scale: float = 1.0) -> bytes:
    if scale != 1.0:
        image = image.resize((int(image.width * scale), int(image.height * scale)))
    buffer = BytesIO()
    image.save(buffer, format="JPEG", quality=quality)
    return buffer.getvalue()


@pytest.fixture
def index_path(tmp_path):
    index = ReferenceIndex()
    index.add(make_site_screenshot(0), {"id": "site-a", "category": "slot"})
    index.add(make_site_screenshot(1), {"id": "site-b", "category": "casino"})
    path = tmp_path / "index.npz"
    index.save(path)
    return path


def test_recompressed_copy_matches_its_reference(index_path):
    detector = VisualSimilarityDetector(index_path=index_path)
    result = detector.detect(to_jpeg(make_site_screenshot(0), quality=50, scale=0.7))
    assert result.status == DetectionStatus.OK
    assert result.label.startswith("Visual Match")
    assert result.evidence["best_match"]["id"] == "site-a"
    assert result.score >= 0.7


def test_unrelated_screenshot_does_not_match(index_path):
    detector = VisualSimilarityDetector(index_path=index_path)
    result = detector.detect(to_jpeg(make_site_screenshot(2)))
    assert result.status == DetectionStatus.OK
    assert result.label == "No Visual Match"
    assert result.score < 0.7


def test_similarity_below_the_threshold_adds_nothing_to_the_score(index_path):
    """'No Visual Match' tidak boleh tetap menyumbang skor ke hasil gabungan.

    Kemiripan mentah tetap dicatat di evidence sebagai bukti.
    """
    detector = VisualSimilarityDetector(index_path=index_path)
    result = detector.detect(to_jpeg(make_site_screenshot(2)))
    assert result.label == "No Visual Match"
    assert result.score == 0.0
    assert 0.0 <= result.evidence["similarity"] < detector.match_threshold


def test_matching_screenshot_keeps_its_similarity_as_score(index_path):
    detector = VisualSimilarityDetector(index_path=index_path)
    result = detector.detect(to_jpeg(make_site_screenshot(0), quality=50, scale=0.7))
    assert result.score == result.evidence["similarity"] >= detector.match_threshold


def test_missing_index_is_skipped_not_failed(tmp_path):
    detector = VisualSimilarityDetector(index_path=tmp_path / "nope.npz")
    result = detector.detect(to_jpeg(make_site_screenshot(0)))
    assert result.status == DetectionStatus.SKIPPED


def test_corrupt_image_fails_cleanly(index_path):
    detector = VisualSimilarityDetector(index_path=index_path)
    result = detector.detect(b"this is not an image")
    assert result.status == DetectionStatus.FAILED
    assert result.error.code == "INVALID_IMAGE"


def test_index_round_trip_and_build_from_directory(tmp_path):
    folder = tmp_path / "refs"
    folder.mkdir()
    make_site_screenshot(0).save(folder / "a.png")
    make_site_screenshot(1).save(folder / "b.jpg")
    (folder / "notes.txt").write_text("ignored")

    built = ReferenceIndex.build_from_directory(folder)
    assert len(built) == 2

    path = tmp_path / "out.npz"
    built.save(path)
    loaded = ReferenceIndex.load(path)
    assert [m["filename"] for m in loaded.metadata] == ["a.png", "b.jpg"]
    assert (loaded.phashes == built.phashes).all()


# --- Data nyata dari data/samples/ocr/ (screenshot halaman sungguhan) ---

def _real_screenshots(label):
    from tests.samples import entries, screenshot_of
    return [(e, screenshot_of(e)) for e in entries(label) if screenshot_of(e)]


def _index_of(shots, tmp_path):
    """Indeks referensi dari daftar (entry, path); kembalikan jalur file indeks."""
    index = ReferenceIndex()
    for entry, path in shots:
        with Image.open(path) as image:
            image.load()
            index.add(image, {"id": entry["nama"], "url": entry["url"]})
    out = Path(tmp_path) / "real_index.npz"
    index.save(out)
    return out


@needs_samples
@pytest.mark.xfail(strict=False, reason=(
    "Celah terukur (29/10/2026): 0 dari 3 pasangan satu-platform cocok (ameblo, gumroad, "
    "scrapbox). pHash hanya mengenali salinan yang hampir identik; halaman satu platform dengan "
    "isi berbeda tidak cocok. Kesamaan semantik butuh CLIP, yang belum diuji."))
def test_sample_pages_from_the_same_platform_match(tmp_path):
    """Dua halaman judi di platform yang sama (mis. dua posting forum) berbagi tata letak.

    Per platform dengan >= 2 screenshot, yang pertama dijadikan referensi dan
    sisanya diuji. Minimal separuh harus cocok.
    """
    from tests.samples import registrable_domain
    groups = {}
    for entry, path in _real_screenshots("judi"):
        groups.setdefault(registrable_domain(entry["url"]), []).append((entry, path))
    pairs = [(g[0], g[1:]) for g in groups.values() if len(g) >= 2]

    checked = matched = 0
    for reference, others in pairs:
        detector = VisualSimilarityDetector(index_path=_index_of([reference], tmp_path))
        for _, path in others:
            checked += 1
            matched += detector.detect(path).label.startswith("Visual Match")
    if checked < 3:
        pytest.skip(f"hanya {checked} perbandingan satu-platform ({matched} cocok); "
                    "belum cukup untuk kesimpulan, kumpulkan lebih banyak halaman dari platform yang sama")
    assert matched / checked >= 0.5, f"hanya {matched}/{checked} yang cocok"


@needs_samples
def test_sample_normal_pages_never_match_the_gambling_index(tmp_path):
    """Indeks berisi semua screenshot judi nyata; situs biasa dan berita tidak boleh cocok."""
    gambling = _real_screenshots("judi")
    if not gambling:
        pytest.skip("tidak ada screenshot judi yang valid")
    detector = VisualSimilarityDetector(index_path=_index_of(gambling, tmp_path))
    others = _real_screenshots("normal") + _real_screenshots("mirip_tapi_bukan")
    matched = [e["url"] for e, path in others
               if detector.detect(path).label.startswith("Visual Match")]
    assert others and not matched, f"salah cocok: {matched}"


def show_samples() -> int:
    from tests.samples import registrable_domain
    gambling = _real_screenshots("judi")
    if not gambling:
        print("data/samples/ belum ada atau tidak ada screenshot judi yang valid.")
        return 2
    with tempfile.TemporaryDirectory() as tmp:
        detector = VisualSimilarityDetector(index_path=_index_of(gambling, tmp))
        print(f"{'':3}{'Label':17}{'Hasil':18} {'Skor':5} {'Paling mirip':34} Halaman")
        for label in ("judi", "normal", "mirip_tapi_bukan"):
            for entry, path in _real_screenshots(label):
                result = detector.detect(path)
                best = (result.evidence or {}).get("best_match", {})
                # screenshot judi pasti cocok dengan dirinya sendiri; tampilkan juga
                # kecocokan terbaik selain dirinya hanya untuk yang bukan judi
                self_match = best.get("id") == entry["nama"]
                matched = result.label.startswith("Visual Match")
                ok = matched if label == "judi" else not matched
                note = "(dirinya sendiri)" if self_match else best.get("id", "-")
                print(f"{'OK' if ok else 'XX':3}{label:17}{result.label:18} {result.score:.2f}  "
                      f"{note[:34]:34} {entry['url'][8:60]}")
    print("\nCatatan: tiap screenshot judi ada di indeks, jadi pasti cocok dengan dirinya sendiri.")
    return 0


def main(argv) -> int:
    if argv == ["--samples"]:  # semua screenshot di data/samples/
        return show_samples()

    if argv:  # screenshot milik sendiri vs indeks asli
        detector = VisualSimilarityDetector()
        for path in argv:
            result = detector.detect(path)
            print(f"{result.status.value:8} {result.label:18} skor {result.score:.2f}  {path}")
            evidence = result.evidence or {}
            if "best_match" in evidence:
                print(f"    paling mirip: {evidence['best_match'].get('id')} (metode {evidence['method']})")
            if result.status == DetectionStatus.SKIPPED:
                print(f"    {evidence.get('reason')}")
                print("    Buat indeks: python scripts/build_reference_index.py --image-dir <folder JPG/PNG>")
        return 0

    with tempfile.TemporaryDirectory() as tmp:
        index = ReferenceIndex()
        index.add(make_site_screenshot(0), {"id": "situs-judi-A"})
        index.add(make_site_screenshot(1), {"id": "situs-judi-B"})
        index.save(Path(tmp) / "index.npz")
        detector = VisualSimilarityDetector(index_path=Path(tmp) / "index.npz")

        cases = [
            ("Salinan terkompres situs A", to_jpeg(make_site_screenshot(0), 50, 0.7), "Visual Match"),
            ("Salinan terkompres situs B", to_jpeg(make_site_screenshot(1), 45, 0.8), "Visual Match"),
            ("Tampilan lain (tidak ada di indeks)", to_jpeg(make_site_screenshot(2)), "No Visual Match"),
            ("Bukan gambar", b"ini bukan gambar", "Error"),
        ]
        print(f"{'':3}{'Kasus':38} {'Harapan':16} {'Hasil':16} Skor  Paling mirip")
        wrong = 0
        for name, data, expected in cases:
            result = detector.detect(data)
            ok = result.label.startswith(expected)
            wrong += not ok
            match = (result.evidence or {}).get("best_match", {}).get("id", "-")
            print(f"{'OK' if ok else 'XX':3}{name:38} {expected:16} {result.label:16} {result.score:.2f}  {match}")
        print(f"\n{len(cases) - wrong}/{len(cases)} sesuai harapan")
        return 1 if wrong else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
