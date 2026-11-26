#!/usr/bin/env python3
"""Build the reference index for DET-02 Visual Similarity Detection.

Usage (from the repo root):
    python scripts/build_reference_index.py --image-dir path/to/gambling_screenshots

By default only perceptual hashes (pHash) are stored, which needs no model
download. Add --clip to also store CLIP embeddings (needs torch, transformers
and a ~600 MB model download on first use).
"""

import argparse
import logging
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from detection_engine.config.detection_config import config  # noqa: E402
from detection_engine.detectors.det02_visual_similarity.reference_index import (  # noqa: E402
    ClipEmbedder, ReferenceIndex,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build reference index for visual similarity")
    parser.add_argument("--image-dir", required=True,
                        help="Directory with reference screenshots (JPG/PNG)")
    parser.add_argument("--metadata", default="data/reference_metadata.json",
                        help="JSON file mapping filename to extra fields "
                             "(type, category, risk_level). type=situs_judi: halaman situs "
                             "judi sendiri, header-nya ikut dicocokkan (default: %(default)s)")
    parser.add_argument("--output", default=config.reference_index_path,
                        help="Output .npz path (default: %(default)s)")
    parser.add_argument("--clip", action="store_true",
                        help="Also store CLIP embeddings")
    parser.add_argument("--keep-text-pages", action="store_true",
                        help="Jangan buang halaman blokir/anti-bot/404 yang dikenali lewat OCR")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING,
                        format="%(asctime)s - %(levelname)s - %(message)s")

    embedder = None
    if args.clip:
        try:
            embedder = ClipEmbedder(config.clip_model_name)
        except Exception as e:
            print(f"CLIP tidak tersedia ({e}). Pasang: pip install torch transformers")
            return 1

    skipped = []
    try:
        index = ReferenceIndex.build_from_directory(
            args.image_dir, args.metadata, embedder,
            skip_check=None if args.keep_text_pages else text_page_check(),
            on_skip=lambda name, reason: skipped.append((name, reason)))
    except (FileNotFoundError, RuntimeError) as e:
        print(f"Gagal: {e}")
        return 1

    for name, reason in skipped:
        print(f"  dilewati {name}: {reason}")
    if len(index) == 0:
        print("Tidak ada gambar JPG/PNG yang valid di folder tersebut.")
        return 1

    index.save(args.output)
    print(f"Indeks berisi {len(index)} gambar disimpan ke {args.output} ({len(skipped)} dilewati, "
          f"{int(index.header_mask.sum())} dengan pencocokan header)")
    return 0


NOT_FOUND = re.compile(r"\b(?:404|not found|page not found|halaman tidak ditemukan)\b", re.IGNORECASE)


def text_page_check():
    """Pemeriksa OCR: buang screenshot yang ternyata halaman blokir, anti-bot, atau 404.

    Saat pengumpulan sampel, situs sering membalas dengan halaman Cloudflare
    ("Sorry, you have been blocked") alih-alih kontennya. Gambar seperti itu identik
    antar-situs, sehingga semua situs yang memblokir bot akan tampak "mirip situs judi".
    """
    from detection_engine.detectors.det03_ocr.ocr_detector import OCRDetector
    from detection_engine.scraper.classify import is_block_page, is_bot_challenge

    ocr = OCRDetector()  # mengatur lokasi Tesseract
    if not ocr._tesseract_ready():
        print("Tesseract tidak ditemukan; pemeriksaan halaman blokir/404 dilewati.")
        return None
    import pytesseract

    def check(image):
        text = pytesseract.image_to_string(image.convert("L"), timeout=30)
        first_line = next((line for line in text.splitlines() if line.strip()), "")
        if is_bot_challenge(first_line, text):
            return "halaman anti-bot/verifikasi keamanan"
        if is_block_page("", text):
            return "halaman blokir Internet Positif"
        if len(text.strip()) <= 1500 and NOT_FOUND.search(text):
            return "halaman 404 / tidak ditemukan"
        return None

    return check


if __name__ == "__main__":
    sys.exit(main())
