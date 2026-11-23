"""Layanan FastAPI untuk analisis situs (DET-06).

Jalankan dari root repo:
    python -m uvicorn detection_engine.api.main:app --port 8001

Port 8001, bukan 8000: Supabase self-hosted (Kong) memakai localhost:8000.
Next.js mencari API ini lewat DETECTION_API_URL (bawaan http://127.0.0.1:8001).

Endpoint:
    GET  /health    cek layanan hidup
    POST /analyze   multipart/form-data: url, page_text, screenshot (JPG/PNG, maks. 5 MB);
                    minimal satu terisi. Mengembalikan ringkasan pipeline:
                    request_id, indication (Rendah/Sedang/Tinggi), overall_score, modules.
                    URL TIDAK dibuka; DET-01 hanya menilai teks URL-nya.
    POST /scan      multipart/form-data: url (wajib), screenshot (opsional).
                    MEMBUKA link dengan Chromium headless (detection_engine/scraper), lalu
                    menilai URL akhir (DET-01), teks halaman (DET-04), dan screenshot
                    halaman atau unggahan (DET-02, DET-03). Ringkasan sama dengan /analyze
                    ditambah "scan": status halaman, judul, URL akhir, screenshot (base64).

Keamanan:
    * Screenshot hanya diterima sebagai berkas unggahan yang diperiksa isinya. DetectionInput
      menerima string sebagai path file, jadi nilai string dari klien tidak pernah diteruskan.
    * /scan membuka URL dari pengguna, jadi setiap alamat dicek dulu: host yang mengarah ke
      jaringan internal (127.0.0.1, 10.x, 192.168.x, metadata cloud, dst.) ditolak, termasuk
      lewat redirect dan sumber daya halaman (lihat detection_engine/scraper/safety.py).
    * Bila DETECTION_API_KEY diisi, /scan hanya melayani permintaan dengan header X-API-Key
      yang sama (dikirim oleh route Next.js di server, tidak pernah oleh browser).
"""

import asyncio
import base64
import io
import os
import secrets
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
from typing import Any, Dict, Optional

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from pydantic import ValidationError

from detection_engine.models.detection_models import DetectionInput
from detection_engine.pipeline import DetectionPipeline
from detection_engine.scraper.fetcher import FetchConfig, PageFetcher, ScrapeOutcome

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_PAGE_TEXT_CHARS = 200_000
ALLOWED_IMAGE_FORMATS = {"PNG", "JPEG"}

app = FastAPI(title="GambleWatch Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in
                   os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@lru_cache(maxsize=1)
def _default_pipeline() -> DetectionPipeline:
    return DetectionPipeline()


def get_pipeline() -> DetectionPipeline:
    return _default_pipeline()


async def _read_screenshot(upload: UploadFile) -> bytes:
    data = await upload.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Ukuran gambar melebihi 5 MB.")
    try:
        with Image.open(io.BytesIO(data)) as image:
            image.verify()
            image_format = image.format
    except (UnidentifiedImageError, OSError, SyntaxError):
        raise HTTPException(422, "Berkas bukan gambar yang valid. Gunakan JPG atau PNG.")
    if image_format not in ALLOWED_IMAGE_FORMATS:
        raise HTTPException(422, "Format gambar tidak didukung. Gunakan JPG atau PNG.")
    return data


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(
    url: Optional[str] = Form(None),
    page_text: Optional[str] = Form(None),
    screenshot: Optional[UploadFile] = File(None),
    pipeline: DetectionPipeline = Depends(get_pipeline),
) -> dict:
    url = (url or "").strip() or None
    page_text = (page_text or "").strip() or None
    upload = screenshot

    if not (url or page_text or upload):
        raise HTTPException(422, "Isi minimal satu: url, page_text, atau screenshot.")
    if page_text and len(page_text) > MAX_PAGE_TEXT_CHARS:
        raise HTTPException(422, f"page_text melebihi {MAX_PAGE_TEXT_CHARS} karakter.")

    image = await _read_screenshot(upload) if upload else None

    try:
        detection_input = DetectionInput.model_validate({
            "url": url, "screenshot": image,
            "scraped": {"page_text": page_text or ""} if page_text else None})
    except ValidationError:
        raise HTTPException(422, "URL tidak valid. Gunakan alamat http atau https.")

    result = await pipeline.run_all_async(detection_input)
    return pipeline.get_summary(result)


# --- POST /scan: buka link lalu nilai isinya -----------------------------------------

class PageScanner:
    """Satu Chromium yang dipakai ulang, dijalankan di SATU thread khusus.

    Playwright versi sync tidak boleh dipakai lintas thread, dan endpoint FastAPI berjalan
    di event loop. Semua scan diantrekan ke thread ini, sehingga paling banyak satu halaman
    dibuka pada satu waktu (cukup untuk laporan masyarakat; scan massal lewat worker).
    """

    def __init__(self, config: Optional[FetchConfig] = None):
        self._config = config
        self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="scanner")
        self._fetcher: Optional[PageFetcher] = None

    def _fetch(self, url: str) -> ScrapeOutcome:
        if self._fetcher is None:
            self._fetcher = PageFetcher(self._config)
        return self._fetcher.fetch(url)

    async def fetch(self, url: str) -> ScrapeOutcome:
        return await asyncio.wrap_future(self._executor.submit(self._fetch, url))


@lru_cache(maxsize=1)
def _default_scanner() -> PageScanner:
    return PageScanner()


def get_scanner() -> PageScanner:
    return _default_scanner()


def _check_api_key(provided: Optional[str]) -> None:
    expected = os.getenv("DETECTION_API_KEY", "")
    if expected and not secrets.compare_digest((provided or "").encode(), expected.encode()):
        raise HTTPException(401, "API key tidak valid.")


SCAN_MESSAGES = {
    "SUCCESS": "Halaman berhasil dibuka dan isinya dianalisis.",
    "BLOCKED": "Situs sudah diblokir (halaman Internet Positif/TrustPositif). Dinilai dari URL saja.",
    "BOT_PROTECTION": "Situs menolak pemindaian otomatis (proteksi anti-bot). Dinilai dari URL saja.",
    "DNS": "Domain tidak ditemukan atau sudah tidak aktif. Dinilai dari URL saja.",
    "TIMEOUT": "Halaman terlalu lama dimuat. Dinilai dari URL saja.",
    "CONNECTION": "Situs tidak dapat dihubungi. Dinilai dari URL saja.",
    "TLS": "Sertifikat keamanan situs bermasalah. Dinilai dari URL saja.",
    "HTTP_4XX": "Halaman tidak ditemukan atau ditolak server situs. Dinilai dari URL saja.",
    "HTTP_5XX": "Server situs sedang bermasalah. Dinilai dari URL saja.",
    "UNSAFE_TARGET": "Alamat tidak boleh dibuka (jaringan internal atau format tidak diizinkan).",
    "DOWNLOAD": "Link mengarah ke unduhan berkas, tidak dibuka. Dinilai dari URL saja.",
}


def _scan_info(url: str, outcome: ScrapeOutcome, uploaded: bool) -> Dict[str, Any]:
    capture = outcome.capture
    info: Dict[str, Any] = {
        "status": outcome.status,
        "failure_code": outcome.failure_code,
        "message": SCAN_MESSAGES.get(outcome.failure_code or outcome.status,
                                     "Halaman gagal dibuka. Dinilai dari URL saja."),
        "requested_url": url,
        "final_url": None, "http_status": None, "title": None, "redirect_chain": [],
        "text_chars": 0, "links": 0, "load_ms": None,
        "screenshot_source": "unggahan" if uploaded else None,
        "screenshot_base64": None,
    }
    if capture is not None:
        info.update(
            final_url=capture.final_url, http_status=capture.http_status,
            title=capture.title or None, redirect_chain=capture.redirect_chain,
            text_chars=len(capture.text) if outcome.ok else 0,
            links=len(capture.outbound_links), load_ms=capture.load_ms,
        )
        # Screenshot halaman ikut dikembalikan sebagai bukti, termasuk halaman blokir
        if capture.screenshot and not uploaded:
            info["screenshot_source"] = "halaman"
            info["screenshot_base64"] = base64.b64encode(capture.screenshot).decode("ascii")
    return info


@app.post("/scan")
async def scan(
    url: str = Form(...),
    screenshot: Optional[UploadFile] = File(None),
    x_api_key: Optional[str] = Header(None),
    pipeline: DetectionPipeline = Depends(get_pipeline),
    scanner: PageScanner = Depends(get_scanner),
) -> dict:
    _check_api_key(x_api_key)
    url = (url or "").strip()
    if not url:
        raise HTTPException(422, "URL wajib diisi untuk pemindaian.")

    image = await _read_screenshot(screenshot) if screenshot else None
    outcome = await scanner.fetch(url)

    # Isi halaman hanya dinilai bila halaman benar-benar terbuka. Halaman blokir,
    # tantangan anti-bot, dan halaman error bukan konten situs.
    capture = outcome.capture if outcome.ok else None
    scraped = None
    if capture is not None:
        scraped = {"page_text": capture.text, "title": capture.title,
                   "meta": {"description": capture.meta_description},
                   "links": capture.outbound_links, "media_urls": []}
    page_shot = capture.screenshot if capture is not None else None

    detection_input = None
    candidates = [capture.final_url] if capture is not None else []
    candidates.append(url if "://" in url else f"https://{url}")
    for candidate in candidates:
        try:
            detection_input = DetectionInput.model_validate(
                {"url": candidate, "screenshot": image or page_shot, "scraped": scraped})
            break
        except ValidationError:
            continue
    if detection_input is None:
        raise HTTPException(422, "URL tidak valid. Gunakan alamat http atau https.")

    result = await pipeline.run_all_async(detection_input)
    summary = pipeline.get_summary(result)
    summary["scan"] = _scan_info(url, outcome, uploaded=image is not None)
    return summary
