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


# --- POST /scan: membuka link lalu menilai isinya ------------------------------------

import base64  # noqa: E402

from detection_engine.api.main import get_scanner  # noqa: E402
from detection_engine.scraper.fetcher import PageCapture, ScrapeOutcome  # noqa: E402


class FakeScanner:
    def __init__(self, outcome: ScrapeOutcome):
        self.outcome = outcome
        self.urls = []

    async def fetch(self, url, profile="desktop"):
        self.urls.append(url)
        return self.outcome


def page_capture(text="Daftar slot gacor maxwin hari ini", screenshot=None) -> PageCapture:
    return PageCapture(
        requested_url="https://situs-netral.example/", final_url="https://situs-netral.example/home",
        http_status=200, redirect_chain=["https://situs-netral.example/"], title="Beranda",
        meta_description="", text=text, screenshot=screenshot or png_bytes(),
        outbound_links=["https://link-alternatif.example/"], load_ms=900, user_agent="UA")


@pytest.fixture
def scan_client(client):
    def use(outcome):
        scanner = FakeScanner(outcome)
        app.dependency_overrides[get_scanner] = lambda: scanner
        return client, scanner
    return use


def test_scan_analyses_page_content_not_only_url(scan_client, stubs):
    capture = page_capture()
    client, scanner = scan_client(ScrapeOutcome("SUCCESS", capture=capture))

    response = client.post("/scan", data={"url": "situs-netral.example"})

    assert response.status_code == 200
    assert scanner.urls == ["situs-netral.example"]
    # teks halaman masuk DET-04, screenshot halaman masuk DET-02/03, URL akhir masuk DET-01
    assert stubs["text"].calls == ["Daftar slot gacor maxwin hari ini"]
    assert stubs["ocr"].calls == [capture.screenshot]
    assert stubs["visual"].calls == [capture.screenshot]
    assert stubs["url"].calls == ["https://situs-netral.example/home"]
    scan = response.json()["scan"]
    assert scan["status"] == "SUCCESS" and scan["title"] == "Beranda"
    assert scan["final_url"] == "https://situs-netral.example/home"
    assert scan["screenshot_source"] == "halaman"
    assert base64.b64decode(scan["screenshot_base64"]) == capture.screenshot


def test_scan_prefers_uploaded_screenshot(scan_client, stubs):
    uploaded = png_bytes((30, 30))
    client, _ = scan_client(ScrapeOutcome("SUCCESS", capture=page_capture()))

    response = client.post("/scan", data={"url": "https://situs-netral.example"},
                           files={"screenshot": ("bukti.png", uploaded, "image/png")})

    assert response.status_code == 200
    assert stubs["ocr"].calls == [uploaded]
    scan = response.json()["scan"]
    assert scan["screenshot_source"] == "unggahan" and scan["screenshot_base64"] is None


def test_scan_falls_back_to_url_when_page_cannot_open(scan_client, stubs):
    client, _ = scan_client(ScrapeOutcome("FAILED", "DNS", "slot88.example: not found"))

    response = client.post("/scan", data={"url": "slot88.example/daftar"})

    assert response.status_code == 200
    assert stubs["url"].calls == ["https://slot88.example/daftar"]
    assert stubs["text"].calls == [] and stubs["ocr"].calls == []
    scan = response.json()["scan"]
    assert scan["status"] == "FAILED" and scan["failure_code"] == "DNS"
    assert "Dinilai dari URL saja" in scan["message"]


def test_scan_does_not_analyse_block_page_text(scan_client, stubs):
    capture = page_capture(text="Situs ini diblokir. Internet Positif.")
    client, _ = scan_client(ScrapeOutcome("BLOCKED", "BLOCKED", "diblokir", capture=capture))

    response = client.post("/scan", data={"url": "https://slot88.example"})

    assert stubs["text"].calls == [] and stubs["ocr"].calls == []
    scan = response.json()["scan"]
    assert scan["status"] == "BLOCKED" and scan["screenshot_base64"]   # bukti halaman blokir


def test_scan_requires_url(scan_client):
    client, _ = scan_client(ScrapeOutcome("SUCCESS", capture=page_capture()))
    assert client.post("/scan", data={"url": "   "}).status_code == 422
    assert client.post("/scan", data={}).status_code == 422


def test_scan_api_key(scan_client, monkeypatch):
    client, _ = scan_client(ScrapeOutcome("FAILED", "DNS", "x"))
    monkeypatch.setenv("DETECTION_API_KEY", "rahasia-uji")
    assert client.post("/scan", data={"url": "a.example"}).status_code == 401
    assert client.post("/scan", data={"url": "a.example"},
                       headers={"X-API-Key": "salah"}).status_code == 401
    assert client.post("/scan", data={"url": "a.example"},
                       headers={"X-API-Key": "rahasia-uji"}).status_code == 200


def test_scan_real_browser_and_pipeline_detect_content_behind_neutral_url(tmp_path, monkeypatch):
    """Integrasi penuh: Chromium membuka situs uji lokal ber-URL netral, isinya judi."""
    pytest.importorskip("playwright")
    import threading
    from functools import partial
    from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

    import detection_engine.scraper.safety as safety
    from detection_engine.api.main import PageScanner
    from detection_engine.scraper.fetcher import FetchConfig

    (tmp_path / "index.html").write_text(
        "<html><head><title>Beranda</title></head><body><h1>Daftar Slot Gacor Hari Ini</h1>"
        "<p>Bonus new member 100%, deposit pulsa tanpa potongan, RTP live, maxwin x500.</p>"
        "</body></html>", encoding="utf-8")

    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Quiet, directory=str(tmp_path)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    monkeypatch.setattr(safety, "ALLOWED_PORTS", (None, server.server_address[1]))
    scanner = PageScanner(FetchConfig(allow_private=True, nav_timeout_ms=15_000, settle_ms=500))
    app.dependency_overrides.clear()
    app.dependency_overrides[get_scanner] = lambda: scanner
    try:
        response = TestClient(app).post(
            "/scan", data={"url": f"http://127.0.0.1:{server.server_address[1]}/index.html"})
    except Exception as exc:  # Chromium belum di-install
        pytest.skip(f"Chromium Playwright tidak tersedia: {exc}")
    finally:
        app.dependency_overrides.clear()
        server.shutdown()
        scanner.close()

    body = response.json()
    assert response.status_code == 200, body
    if body["scan"]["status"] == "FAILED" and "Executable" in str(body["scan"]):
        pytest.skip("Chromium Playwright tidak tersedia")
    assert body["scan"]["status"] == "SUCCESS" and body["scan"]["title"] == "Beranda"
    assert body["modules"]["keyword_analysis"]["score"] > 0
    assert body["indication"] in ("Sedang", "Tinggi")


class ProfileScanner:
    """Halaman berbeda per profil: tampilan biasa bersih, versi untuk Google berisi spam judi."""

    def __init__(self, texts):
        self.texts = texts
        self.profiles = []

    async def fetch(self, url, profile="desktop"):
        self.profiles.append(profile)
        return ScrapeOutcome("SUCCESS", capture=page_capture(text=self.texts.get(profile, "")))


class KeywordStub:
    """DET-04 palsu: skor tinggi hanya bila teks memuat 'slot gacor'."""

    def __init__(self):
        self.detector_type = DetectorType.TEXT_KEYWORD

    def detect(self, value, timeout=None):
        score = 0.9 if "slot gacor" in str(value) else 0.0
        return DetectionResult(detector=self.detector_type, status=DetectionStatus.OK,
                               label="stub", score=score, evidence={}, duration_ms=1)


def _retry_client(texts):
    pipeline = DetectionPipeline(
        url_detector=StubDetector(DetectorType.URL_PATTERN, 0.0), text_detector=KeywordStub(),
        ocr_detector=StubDetector(DetectorType.OCR, 0.0),
        visual_detector=StubDetector(DetectorType.VISUAL_SIMILARITY, 0.0))
    scanner = ProfileScanner(texts)
    app.dependency_overrides[get_pipeline] = lambda: pipeline
    app.dependency_overrides[get_scanner] = lambda: scanner
    return TestClient(app), scanner


def test_scan_detects_cloaking_shown_only_to_search_engines():
    client, scanner = _retry_client({"desktop": "Berita kampus hari ini", "search": "slot gacor maxwin"})
    try:
        body = client.post("/scan", data={"url": "https://kampus.example"}).json()
    finally:
        app.dependency_overrides.clear()
    assert scanner.profiles == ["desktop", "search", "mobile"]
    assert body["scan"]["profile"] == "search"
    assert body["scan"]["cloaking"] is True
    assert body["indication"] in ("Sedang", "Tinggi")


def test_scan_does_not_retry_when_desktop_already_flags():
    client, scanner = _retry_client({"desktop": "slot gacor maxwin"})
    try:
        body = client.post("/scan", data={"url": "https://slot.example"}).json()
    finally:
        app.dependency_overrides.clear()
    assert scanner.profiles == ["desktop"]
    assert body["scan"]["cloaking"] is False


def test_scan_mobile_only_content_is_used_without_cloaking_flag():
    client, _ = _retry_client({"desktop": "Toko online", "mobile": "Promo khusus HP slot gacor"})
    try:
        body = client.post("/scan", data={"url": "https://toko.example"}).json()
    finally:
        app.dependency_overrides.clear()
    assert body["scan"]["profile"] == "mobile"
    assert body["scan"]["cloaking"] is False


class InformationalStub(KeywordStub):
    """Halaman membahas judi (ada kata "judi") tetapi dinilai informatif: skor rendah."""

    def detect(self, value, timeout=None):
        if "judi" in str(value):
            return DetectionResult(detector=self.detector_type, status=DetectionStatus.OK, label="No Keywords",
                                   score=0.05, evidence={"keywords_found": [{"keyword": "judi"}]}, duration_ms=1)
        return super().detect(value, timeout)


def test_scan_does_not_retry_pages_that_discuss_gambling():
    # Wikipedia "Perjudian" versi HP lebih pendek, konteks informatifnya hilang -> sempat Tinggi
    pipeline = DetectionPipeline(
        url_detector=StubDetector(DetectorType.URL_PATTERN, 0.0), text_detector=InformationalStub(),
        ocr_detector=StubDetector(DetectorType.OCR, 0.0),
        visual_detector=StubDetector(DetectorType.VISUAL_SIMILARITY, 0.0))
    scanner = ProfileScanner({"desktop": "Sejarah judi dan dampaknya", "mobile": "slot gacor judi"})
    app.dependency_overrides[get_pipeline] = lambda: pipeline
    app.dependency_overrides[get_scanner] = lambda: scanner
    try:
        body = TestClient(app).post("/scan", data={"url": "https://wiki.example/judi"}).json()
    finally:
        app.dependency_overrides.clear()
    assert scanner.profiles == ["desktop"]
    assert body["indication"] == "Rendah"
