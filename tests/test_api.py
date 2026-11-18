"""Tes API analisis (DET-06): kontrak POST /analyze antara Next.js dan mesin deteksi."""

import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from detection_engine.api.main import MAX_UPLOAD_BYTES, app, get_pipeline
from detection_engine.models.detection_models import (
    DetectionResult,
    DetectionStatus,
    DetectorType,
)
from detection_engine.pipeline import DetectionPipeline


class StubDetector:
    def __init__(self, detector_type, score):
        self.detector_type = detector_type
        self.score = score
        self.calls = []

    def detect(self, value, timeout=None):
        self.calls.append(value)
        return DetectionResult(
            detector=self.detector_type, status=DetectionStatus.OK,
            label="stub", score=self.score, evidence={}, duration_ms=1)


@pytest.fixture
def stubs():
    return {
        "url": StubDetector(DetectorType.URL_PATTERN, 0.8),
        "text": StubDetector(DetectorType.TEXT_KEYWORD, 0.7),
        "ocr": StubDetector(DetectorType.OCR, 0.6),
        "visual": StubDetector(DetectorType.VISUAL_SIMILARITY, 0.1),
    }


@pytest.fixture
def client(stubs):
    pipeline = DetectionPipeline(
        url_detector=stubs["url"], text_detector=stubs["text"],
        ocr_detector=stubs["ocr"], visual_detector=stubs["visual"])
    app.dependency_overrides[get_pipeline] = lambda: pipeline
    yield TestClient(app)
    app.dependency_overrides.clear()


def png_bytes(size=(20, 20)) -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", size, "white").save(buf, format="PNG")
    return buf.getvalue()


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_analyze_url_and_text_returns_summary(client):
    response = client.post("/analyze", data={
        "url": "https://contoh.example/slot", "page_text": "slot gacor maxwin"})
    assert response.status_code == 200
    body = response.json()
    assert body["indication"] in {"Rendah", "Sedang", "Tinggi"}
    assert 0.0 <= body["overall_score"] <= 1.0
    assert set(body["modules"]) == {
        "url_pattern", "visual_similarity", "ocr", "keyword_analysis"}
    assert body["request_id"]


def test_screenshot_upload_reaches_ocr_and_visual_detectors(client, stubs):
    image = png_bytes()
    response = client.post(
        "/analyze", data={"url": "https://contoh.example"},
        files={"screenshot": ("shot.png", image, "image/png")})
    assert response.status_code == 200
    assert stubs["ocr"].calls == [image]
    assert stubs["visual"].calls == [image]
    assert response.json()["modules"]["ocr"]["status"] == "ok"


def test_requires_url_or_screenshot_or_text(client):
    response = client.post("/analyze", data={})
    assert response.status_code == 422


def test_rejects_non_http_url(client):
    response = client.post("/analyze", data={"url": "ftp://contoh.example/file"})
    assert response.status_code == 422


def test_rejects_file_that_is_not_an_image(client):
    response = client.post(
        "/analyze", data={"url": "https://contoh.example"},
        files={"screenshot": ("shot.png", b"bukan gambar", "image/png")})
    assert response.status_code == 422


def test_rejects_image_over_5_mb(client):
    too_big = png_bytes() + b"\0" * (MAX_UPLOAD_BYTES + 1)
    response = client.post(
        "/analyze", data={"url": "https://contoh.example"},
        files={"screenshot": ("shot.png", too_big, "image/png")})
    assert response.status_code == 413


def test_screenshot_is_never_read_as_a_server_path(client, stubs):
    # DetectionInput menerima string sebagai path file; klien tidak boleh bisa
    # memakainya untuk membaca file di server.
    response = client.post("/analyze", data={
        "url": "https://contoh.example", "screenshot": "C:/Windows/win.ini"})
    assert response.status_code == 422
    assert stubs["ocr"].calls == []
    assert stubs["visual"].calls == []


def test_real_pipeline_flags_obvious_gambling_url():
    app.dependency_overrides.clear()
    response = TestClient(app).post("/analyze", data={
        "url": "https://slot-gacor-maxwin88.xyz/rtp-live",
        "page_text": "Daftar slot gacor maxwin, deposit pulsa, jackpot, bonus new member"})
    assert response.status_code == 200
    assert response.json()["indication"] == "Tinggi"
