#!/usr/bin/env python3
"""Ambil halaman contoh (teks + screenshot) untuk validasi DET-01 sampai DET-04.

Jalankan dari root repo:
    python scripts/collect_samples.py --input urls_baru.csv --set validasi3

Berkas masukan CSV punya kolom: url,label,catatan   (label: judi | normal | mirip_tapi_bukan)
Contoh:
    url,label,catatan
    https://contoh-berita.id/artikel,mirip_tapi_bukan,berita penindakan judol

Hasil ditulis dengan format yang sama dengan pengambilan sebelumnya:
    data/samples/teks/<nama>.txt         teks halaman yang terlihat
    data/samples/ocr/<label>/<nama>.png  screenshot layar pertama 1366x900
    data/samples/manifest.json           ditambah satu entri per URL (field "set")
URL yang sudah ada di manifest dilewati. Lalu nilai dengan:
    python scripts/evaluate_samples.py --no-ocr --set validasi3

Kebutuhan sekali pasang (di .venv):
    pip install playwright && python -m playwright install chromium

Keamanan: halaman judi bisa memuat skrip berbahaya. Skrip ini memakai konteks browser
baru tanpa login/cookie, menolak unduhan dan menutup popup, dan membatasi waktu muat.
Jalankan hanya di mesin pengembangan.
"""

import argparse
import csv
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from tests.samples import LABELS, ROOT  # noqa: E402

VIEWPORT = {"width": 1366, "height": 900}
NAV_TIMEOUT_MS = 30_000


def slug(url: str) -> str:
    host = urlparse(url).netloc.lower().removeprefix("www.")
    return re.sub(r"[^a-z0-9.\-]", "_", host)[:60]


def read_input(path: Path):
    with open(path, encoding="utf-8", newline="") as f:
        rows = [r for r in csv.DictReader(f) if (r.get("url") or "").startswith("http")]
    bad = [r.get("label") for r in rows if r.get("label") not in LABELS]
    if bad:
        raise SystemExit(f"Label tidak dikenal {sorted(set(map(str, bad)))}; pilih dari {LABELS}")
    return rows


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--input", required=True, type=Path, help="CSV: url,label,catatan")
    parser.add_argument("--set", dest="set_name", required=True, help="nama set, mis. validasi3")
    args = parser.parse_args()

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Playwright belum terpasang. Jalankan:\n"
              "  pip install playwright\n  python -m playwright install chromium")
        return 2

    rows = read_input(args.input)
    manifest_path = ROOT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else []
    known = {m["url"] for m in manifest}
    next_no = max((m.get("no", 0) for m in manifest), default=0) + 1

    (ROOT / "teks").mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for row in rows:
            url, label = row["url"].strip(), row["label"]
            if url in known:
                print(f"-- sudah ada, dilewati: {url[:80]}")
                continue
            nama = f"{next_no:02d}_{slug(url)}"
            entry = {"set": args.set_name, "no": next_no, "nama": nama, "label": label,
                     "url": url, "catatan": row.get("catatan") or args.set_name}
            next_no += 1
            start = time.time()
            context = browser.new_context(viewport=VIEWPORT, accept_downloads=False, locale="id-ID")
            page = context.new_page()
            page.on("popup", lambda popup: popup.close())
            try:
                page.goto(url, timeout=NAV_TIMEOUT_MS, wait_until="domcontentloaded")
                page.wait_for_timeout(3000)  # beri waktu skrip menampilkan konten
                text = page.inner_text("body")
                (ROOT / "teks" / f"{nama}.txt").write_text(text, encoding="utf-8")
                entry.update(status="ok", panjang_teks=len(text))
                try:
                    shot_dir = ROOT / "ocr" / label
                    shot_dir.mkdir(parents=True, exist_ok=True)
                    shot = shot_dir / f"{nama}.png"
                    page.screenshot(path=str(shot))
                    entry["ukuran_png"] = shot.stat().st_size
                except Exception as exc:  # teks tetap berguna untuk DET-04
                    entry["status"] = "gagal_screenshot"
                    print(f"   screenshot gagal: {exc}")
            except Exception as exc:
                entry["status"] = "timeout" if "Timeout" in type(exc).__name__ else "gagal"
                print(f"   gagal: {str(exc)[:100]}")
            finally:
                context.close()
            entry["detik"] = round(time.time() - start, 1)
            manifest.append(entry)
            manifest_path.write_text(json.dumps(manifest, indent=1, ensure_ascii=False), encoding="utf-8")
            print(f"{entry['status']:17}{label:17}{url[:70]}")
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
