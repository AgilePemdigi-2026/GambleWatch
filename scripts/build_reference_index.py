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
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from detection_engine.config.detection_config import config  # noqa: E402
from detection_engine.detectors.visual.reference_index import (  # noqa: E402
    ClipEmbedder, ReferenceIndex,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build reference index for visual similarity")
    parser.add_argument("--image-dir", required=True,
                        help="Directory with reference screenshots (JPG/PNG)")
    parser.add_argument("--metadata",
                        help="JSON file mapping filename to extra fields "
                             "(type, category, risk_level)")
    parser.add_argument("--output", default=config.reference_index_path,
                        help="Output .npz path (default: %(default)s)")
    parser.add_argument("--clip", action="store_true",
                        help="Also store CLIP embeddings")
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

    try:
        index = ReferenceIndex.build_from_directory(args.image_dir, args.metadata, embedder)
    except (FileNotFoundError, RuntimeError) as e:
        print(f"Gagal: {e}")
        return 1

    if len(index) == 0:
        print("Tidak ada gambar JPG/PNG yang valid di folder tersebut.")
        return 1

    index.save(args.output)
    print(f"Indeks berisi {len(index)} gambar disimpan ke {args.output}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
