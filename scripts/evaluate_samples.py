#!/usr/bin/env python3
"""Run the whole detection pipeline over the collected samples in data/samples/.

Run from the repo root:
    python scripts/evaluate_samples.py            # semua modul termasuk OCR
    python scripts/evaluate_samples.py --no-ocr   # lebih cepat, tanpa OCR

Reads data/samples/manifest.json (written by the collection step), feeds each
page's URL, visible text and screenshot to the pipeline, and compares the
Rendah/Sedang/Tinggi indication with what the label calls for:

    judi              -> Tinggi (Sedang dihitung "ketangkap sebagian")
    normal            -> Rendah
    mirip_tapi_bukan  -> Rendah (membahas judi, tapi bukan situs judi)

Results are also written to data/samples/hasil_evaluasi.csv.
"""

import argparse
import csv
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from detection_engine.models.detection_models import DetectionInput  # noqa: E402
from detection_engine.pipeline import DetectionPipeline  # noqa: E402
from tests.samples import ROOT, is_real_content, screenshot_of, text_of  # noqa: E402

EXPECTED = {"judi": "Tinggi", "normal": "Rendah", "mirip_tapi_bukan": "Rendah"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--no-ocr", action="store_true", help="lewati screenshot/OCR")
    parser.add_argument("--set", choices=("awal", "validasi", "validasi2", "semua"),
                        default="semua",
                        help="awal = halaman yang dipakai merancang aturan; "
                             "validasi, validasi2 = halaman baru yang belum dilihat saat "
                             "aturan diperbaiki (validasi sudah dipakai mendiagnosis)")
    args = parser.parse_args()

    manifest_path = ROOT / "manifest.json"
    if not manifest_path.exists():
        print(f"Tidak ada {manifest_path}. Kumpulkan contoh dulu.")
        return 2
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if args.set != "semua":
        manifest = [m for m in manifest if m.get("set", "awal") == args.set]

    pipeline = DetectionPipeline()
    rows = []
    print(f"{'':3}{'Label':17}{'Harapan':8} {'Hasil':7} {'Skor':5} {'URL':5} {'Kata':5} {'OCR':8} Halaman")
    for entry in manifest:
        if not is_real_content(entry):
            reason = entry["status"] if entry["status"] != "ok" else "halaman blokir/verifikasi/404"
            print(f"-- {entry['label']:17}dilewati ({reason}): {entry['url'][:70]}")
            continue

        text = text_of(entry)
        shot = screenshot_of(entry)
        screenshot = None
        if shot and not args.no_ocr and shot.stat().st_size <= MAX_IMAGE_BYTES:
            screenshot = shot.read_bytes()

        data = DetectionInput(url=entry["url"], screenshot=screenshot,
                              scraped={"page_text": text})
        summary = pipeline.get_summary(pipeline.run_all(data))
        modules = summary["modules"]

        expected = EXPECTED[entry["label"]]
        got = summary["indication"]
        ok = got == expected
        rows.append(dict(
            nama=entry["nama"], label=entry["label"], harapan=expected, hasil=got, benar=ok,
            skor=round(summary["overall_score"], 2),
            skor_url=round(modules["url_pattern"]["score"], 2),
            skor_kata=round(modules["keyword_analysis"]["score"], 2),
            skor_ocr=round(modules["ocr"]["score"], 2), status_ocr=modules["ocr"]["status"],
            url=entry["url"]))
        r = rows[-1]
        print(f"{'OK' if ok else '..':3}{r['label']:17}{expected:8} {got:7} {r['skor']:.2f}  "
              f"{r['skor_url']:.2f}  {r['skor_kata']:.2f}  {r['skor_ocr']:.2f}/{r['status_ocr'][:4]:4} {r['url'][:60]}")

    if not rows:
        print("Tidak ada contoh yang berhasil diambil.")
        return 1

    out = ROOT / "hasil_evaluasi.csv"
    with open(out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

    def group(label):
        return [r for r in rows if r["label"] == label]

    judi, normal, mirip = group("judi"), group("normal"), group("mirip_tapi_bukan")
    print("\n=== Ringkasan ===")
    if judi:
        tinggi = sum(r["hasil"] == "Tinggi" for r in judi)
        sedang = sum(r["hasil"] == "Sedang" for r in judi)
        print(f"Situs/halaman judi   : {tinggi}/{len(judi)} Tinggi, {sedang} Sedang, "
              f"{len(judi) - tinggi - sedang} Rendah (terlewat)")
    if normal:
        flagged = [r for r in normal if r["hasil"] != "Rendah"]
        print(f"{'Situs biasa':33}: {len(normal) - len(flagged)}/{len(normal)} Rendah, "
              f"{len(flagged)} salah ditandai")
    if mirip:
        # Menurut PRD yang meragukan boleh Sedang (ditinjau admin); yang tidak
        # boleh adalah Tinggi, karena membanjiri antrean verifikasi.
        tinggi = sum(r["hasil"] == "Tinggi" for r in mirip)
        sedang = sum(r["hasil"] == "Sedang" for r in mirip)
        print(f"{'Membahas judi (bukan situs judi)':33}: {tinggi}/{len(mirip)} salah Tinggi, "
              f"{sedang} Sedang (ditoleransi), {len(mirip) - tinggi - sedang} Rendah")
    print(f"Detail: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
