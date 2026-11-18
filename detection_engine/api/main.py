"""Layanan FastAPI untuk analisis situs (DET-06).

Jalankan dari root repo:
    python -m uvicorn detection_engine.api.main:app --port 8000

Endpoint:
    GET  /health    cek layanan hidup
    POST /analyze   multipart/form-data: url, page_text, screenshot (JPG/PNG, maks. 5 MB);
                    minimal satu terisi. Mengembalikan ringkasan pipeline:
                    request_id, indication (Rendah/Sedang/Tinggi), overall_score, modules.

Keamanan: screenshot hanya diterima sebagai berkas unggahan yang diperiksa isinya.
DetectionInput menerima string sebagai path file, jadi nilai string dari klien
tidak pernah diteruskan ke sana. Layanan ini tidak mengunduh URL yang dikirim
(DET-01 hanya menilai pola teks URL), sehingga tidak ada risiko SSRF.
"""

import io
import os
from functools import lru_cache
from typing import Optional

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError
from pydantic import ValidationError

from detection_engine.models.detection_models import DetectionInput
from detection_engine.pipeline import DetectionPipeline

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
        detection_input = DetectionInput(
            url=url, screenshot=image,
            scraped={"page_text": page_text or ""} if page_text else None)
    except ValidationError:
        raise HTTPException(422, "URL tidak valid. Gunakan alamat http atau https.")

    result = await pipeline.run_all_async(detection_input)
    return pipeline.get_summary(result)
