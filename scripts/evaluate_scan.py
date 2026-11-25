#!/usr/bin/env python3
"""Ukur akurasi pemindaian link (POST /scan) pada daftar URL berlabel.

Memakai jalur yang sama dengan form analisis: membuka link dengan Chromium, menilai URL, isi
halaman, dan screenshot (DET-01..04), lalu mencoba tampilan "dari Google" dan HP bila tampak
bersih. Tidak ada yang ditulis ke Supabase.

    python scripts/evaluate_scan.py                         # semua URL di data/samples/urls.csv
    python scripts/evaluate_scan.py --per-label 15          # 15 URL pertama per label
    python scripts/evaluate_scan.py --csv daftar.csv --out hasil.csv

CSV masukan: kolom `url` dan `label` (judi / normal / mirip_tapi_bukan).
Hasil per URL ditulis ke --out; ringkasan dicetak di akhir:
    recall      = persen URL judi yang dinilai Sedang/Tinggi
    salah tandai = persen URL normal / mirip_tapi_bukan yang dinilai Sedang/Tinggi
"""

import argparse
import csv
import logging
import os
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.environ.setdefault("GAMBLEWATCH_NO_ENV_FILE", "1")   # kata kunci lokal, tanpa Supabase

FIELDS = ["url", "label", "status", "failure_code", "profile", "cloaking",
          "indication", "score", "detik"]
FLAGGED = {"Sedang", "Tinggi"}


def load_urls(path: Path, per_label: int):
    rows = []
    seen: Counter = Counter()
    with path.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            url, label = (row.get("url") or "").strip(), (row.get("label") or "").strip()
            if not url or not label:
                continue
            if per_label and seen[label] >= per_label:
                continue
            seen[label] += 1
            rows.append((url, label))
    return rows


def percent(part: int, whole: int) -> str:
    return f"{part}/{whole} ({100 * part / whole:.1f}%)" if whole else "-"


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluasi pemindaian link GambleWatch")
    parser.add_argument("--csv", default=str(ROOT / "data" / "samples" / "urls.csv"))
    parser.add_argument("--out", default=str(ROOT / "data" / "samples" / "hasil_scan.csv"))
    parser.add_argument("--per-label", type=int, default=0, help="batasi jumlah URL per label")
    args = parser.parse_args()

    logging.basicConfig(level=logging.ERROR)
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    from fastapi.testclient import TestClient
    from detection_engine.api.main import app

    urls = load_urls(Path(args.csv), args.per_label)
    print(f"Memindai {len(urls)} URL ...")
    results = []
    with TestClient(app) as client:
        for i, (url, label) in enumerate(urls, 1):
            started = time.monotonic()
            response = client.post("/scan", data={"url": url})
            body = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
            scan = body.get("scan") or {}
            row = {
                "url": url, "label": label,
                "status": scan.get("status", f"HTTP_{response.status_code}"),
                "failure_code": scan.get("failure_code") or "",
                "profile": scan.get("profile", ""),
                "cloaking": scan.get("cloaking", False),
                "indication": body.get("indication", ""),
                "score": round(body.get("overall_score", 0.0), 3),
                "detik": round(time.monotonic() - started, 1),
            }
            results.append(row)
            print(f"[{i}/{len(urls)}] {label:16} {row['indication']:6} {row['status']:7} "
                  f"{row['failure_code']:14} {row['profile']:7} {url[:70]}")
    # Chromium ditutup oleh lifespan aplikasi saat TestClient selesai

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(results)

    by_label = defaultdict(list)
    for row in results:
        by_label[row["label"]].append(row)
    judi = by_label.get("judi", [])
    bersih = by_label.get("normal", []) + by_label.get("mirip_tapi_bukan", [])
    opened = [r for r in judi if r["status"] == "SUCCESS"]

    print("\n=== Ringkasan ===")
    print("Recall judi (Sedang/Tinggi)          :", percent(sum(r["indication"] in FLAGGED for r in judi), len(judi)))
    print("  - hanya halaman yang berhasil dibuka:",
          percent(sum(r["indication"] in FLAGGED for r in opened), len(opened)))
    print("Salah tandai normal+mirip            :",
          percent(sum(r["indication"] in FLAGGED for r in bersih), len(bersih)))
    for label, rows in sorted(by_label.items()):
        status = Counter(r["failure_code"] or r["status"] for r in rows)
        print(f"Status {label:16}: " + ", ".join(f"{k} {v}" for k, v in status.most_common()))
    print("Terdeteksi lewat tampilan lain       :",
          dict(Counter(r["profile"] for r in results if r["profile"] not in ("", "desktop"))))
    print("Cloaking                             :", sum(bool(r["cloaking"]) for r in results))
    print(f"Rata-rata waktu per URL              : {sum(r['detik'] for r in results) / max(1, len(results)):.1f} detik")
    print(f"Hasil per URL: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
