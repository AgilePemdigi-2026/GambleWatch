"""DET-02: visual similarity against a reference index (pHash)."""

from io import BytesIO

import pytest
from PIL import Image, ImageDraw

from detection_engine.detectors.visual import ReferenceIndex, VisualSimilarityDetector
from detection_engine.models.detection_models import DetectionStatus


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
