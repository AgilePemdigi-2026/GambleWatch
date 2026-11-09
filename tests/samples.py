"""Akses data nyata di data/samples/ untuk tes DET-01 sampai DET-04.

Folder data/samples/ tidak ikut git (screenshot situs judi, bisa besar), jadi
semua tes yang memakainya otomatis dilewati bila folder itu belum ada.

Isi folder (dibuat oleh pengambilan contoh, lihat tests/README.md):
    manifest.json         daftar halaman: label, url, status pengambilan
    teks/<nama>.txt       teks halaman yang terlihat (untuk DET-04)
    ocr/<label>/<nama>.png  screenshot (untuk DET-02 dan DET-03)
    urls.csv              daftar URL berlabel (untuk DET-01), dibuat oleh
                          scripts/build_urls_csv.py

Label: judi | normal | mirip_tapi_bukan (membahas judi, tapi bukan situs judi)
"""

import csv
import json
import re
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import urlparse

import pytest

ROOT = Path(__file__).resolve().parents[1] / "data" / "samples"
LABELS = ("judi", "normal", "mirip_tapi_bukan")

# Halaman yang bukan konten sebenarnya: diblokir bot, verifikasi, atau 404.
# Situs yang diretas sering melakukan "cloaking": spam judi hanya untuk mesin
# pencari, 404 untuk browser biasa. Halaman seperti itu tidak boleh dihitung
# sebagai contoh judi yang gagal terdeteksi.
NOT_REAL_CONTENT = (
    "internet positif", "trustpositif", "nawala", "situs ini diblokir",
    "you have been blocked", "sorry, you have been blocked", "security verification",
    "verification is complete", "just a moment", "enable javascript and cookies",
    "access denied", "erreur 404", "page demand", "404 not found", "page not found",
    "verify you are human", "unusual traffic",
)


def available() -> bool:
    return (ROOT / "manifest.json").exists()


needs_samples = pytest.mark.skipif(
    not available(), reason="data/samples/ belum ada (contoh nyata tidak dikumpulkan)")


def text_of(entry: Dict) -> str:
    path = ROOT / "teks" / f"{entry['nama']}.txt"
    return path.read_text(encoding="utf-8") if path.exists() else ""


def screenshot_of(entry: Dict) -> Optional[Path]:
    path = ROOT / "ocr" / entry["label"] / f"{entry['nama']}.png"
    return path if path.exists() else None


def is_real_content(entry: Dict) -> bool:
    """True bila halaman benar-benar termuat (bukan halaman blokir/verifikasi/404)."""
    if entry.get("status") != "ok":
        return False
    text = text_of(entry).lower()
    return not (len(text) < 1500 and any(marker in text for marker in NOT_REAL_CONTENT))


def entries(label: Optional[str] = None) -> List[Dict]:
    """Halaman yang berhasil diambil dan isinya nyata, opsional per label."""
    if not available():
        return []
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    return [m for m in manifest
            if is_real_content(m) and (label is None or m["label"] == label)]


def host_of(entry: Dict) -> str:
    return urlparse(entry["url"]).netloc.lower().removeprefix("www.")


def registrable_domain(url: str) -> str:
    """Perkiraan domain induk: dua label terakhir (cukup untuk mengelompokkan platform)."""
    parts = urlparse(url).netloc.lower().removeprefix("www.").split(".")
    return ".".join(parts[-2:]) if len(parts) >= 2 else parts[0]


def url_rows() -> List[Dict]:
    """Baris dari data/samples/urls.csv (kosong bila belum dibuat)."""
    path = ROOT / "urls.csv"
    if not path.exists():
        return []
    with open(path, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


# Kata yang terlihat jelas pada URL; dipakai untuk memberi label "URL-nya sendiri
# menunjukkan judi", terpisah dari detektor yang diuji.
OBVIOUS_URL_TOKENS = re.compile(
    r"slot|togel|gacor|judi|casino|kasino|toto|rtp|maxwin|jackpot|pools|live-?draw|"
    r"\bbet|bet\b|bet\d|\d{2,3}bet|88|777|4d", re.IGNORECASE)


def url_shows_gambling(url: str) -> bool:
    parsed = urlparse(url)
    return bool(OBVIOUS_URL_TOKENS.search(parsed.netloc + parsed.path))
