"""DET-02: Visual similarity detection against known gambling-site screenshots."""

import logging
import time
from io import BytesIO
from pathlib import Path
from typing import Any, Optional, Union

import numpy as np

from detection_engine.config.detection_config import config
from detection_engine.detectors.visual.reference_index import (
    HASH_AVAILABLE, ClipEmbedder, ReferenceIndex, compute_phash_bits,
)
from detection_engine.models.detection_models import (
    DetectionResult, DetectionStatus, DetectorError, DetectorType,
)

if HASH_AVAILABLE:
    from PIL import Image

# pHash Hamming distance at which similarity reaches 0. Near-duplicates
# (rescaled, recompressed, lightly edited) differ by only a few bits, while
# unrelated images differ by ~32, so 20 leaves a wide margin.
PHASH_MAX_DISTANCE = 20


class VisualSimilarityDetector:
    """DET-02: compare a screenshot with the reference index.

    Score is the best match over all reference images:
    - pHash: `1 - hamming_distance / 20`, clipped to 0..1 (near-duplicates)
    - CLIP cosine similarity, only if the index has embeddings and
      `use_clip=True` (semantically similar layouts)
    """

    def __init__(self,
                 index_path: Union[str, Path, None] = None,
                 match_threshold: Optional[float] = None,
                 use_clip: bool = False):
        self.index_path = Path(index_path or config.reference_index_path)
        self.match_threshold = (match_threshold if match_threshold is not None
                                else config.visual_similarity_match_threshold)
        self.use_clip = use_clip
        self.logger = logging.getLogger(__name__)
        self._index: Optional[ReferenceIndex] = None
        self._index_mtime: float = 0.0
        self._embedder: Optional[ClipEmbedder] = None

    # -- public API -----------------------------------------------------

    def detect(self, image: Union[bytes, str, Path], timeout: Optional[float] = None) -> DetectionResult:
        start = time.time()

        if not HASH_AVAILABLE:
            return self._failed("DEPENDENCY_MISSING", "Install Pillow and imagehash", start)

        index = self._get_index()
        if index is None or len(index) == 0:
            return self._skipped(f"Reference index not found or empty: {self.index_path}", start)

        try:
            pil_image = self._load_image(image)
        except Exception as e:
            return self._failed("INVALID_IMAGE", str(e), start)

        try:
            with pil_image:
                best_idx, score, method = self._best_match(pil_image, index)
        except Exception as e:
            self.logger.error("Visual similarity failed: %s", e)
            return self._failed("VISUAL_SIMILARITY_ERROR", str(e), start)

        matched = score >= self.match_threshold
        match_info = dict(index.metadata[best_idx])
        return DetectionResult(
            detector=DetectorType.VISUAL_SIMILARITY,
            status=DetectionStatus.OK,
            label=f"Visual Match {score:.0%}" if matched else "No Visual Match",
            score=float(score),
            evidence={
                "matched": matched,
                "method": method,
                "best_match": match_info,
                "match_threshold": self.match_threshold,
                "reference_count": len(index),
            },
            duration_ms=int((time.time() - start) * 1000),
        )

    # -- internals ------------------------------------------------------

    def _get_index(self) -> Optional[ReferenceIndex]:
        """Load the index, reloading it if the file changed on disk."""
        try:
            mtime = self.index_path.stat().st_mtime
        except OSError:
            return None
        if self._index is None or mtime != self._index_mtime:
            try:
                self._index = ReferenceIndex.load(self.index_path)
                self._index_mtime = mtime
            except Exception as e:
                self.logger.error("Cannot load reference index %s: %s", self.index_path, e)
                return None
        return self._index

    @staticmethod
    def _load_image(image: Union[bytes, str, Path]) -> "Image.Image":
        if isinstance(image, bytes):
            loaded = Image.open(BytesIO(image))
        else:
            loaded = Image.open(str(image))
        loaded.load()
        return loaded

    def _best_match(self, image: "Image.Image", index: ReferenceIndex):
        distances = np.count_nonzero(index.phashes != compute_phash_bits(image), axis=1)
        similarities = np.clip(1.0 - distances / PHASH_MAX_DISTANCE, 0.0, 1.0)
        best_idx = int(np.argmax(similarities))
        score, method = float(similarities[best_idx]), "phash"

        if self.use_clip and index.embeddings is not None:
            clip_scores = index.embeddings @ self._get_embedder(index).embed(image)
            clip_idx = int(np.argmax(clip_scores))
            clip_score = float(np.clip(clip_scores[clip_idx], 0.0, 1.0))
            if clip_score > score:
                best_idx, score, method = clip_idx, clip_score, "clip"

        return best_idx, score, method

    def _get_embedder(self, index: ReferenceIndex) -> ClipEmbedder:
        if self._embedder is None:
            self._embedder = ClipEmbedder(index.model_name or config.clip_model_name)
        return self._embedder

    def _skipped(self, reason: str, start: float) -> DetectionResult:
        return DetectionResult(
            detector=DetectorType.VISUAL_SIMILARITY,
            status=DetectionStatus.SKIPPED,
            label="Skipped",
            score=0.0,
            evidence={"reason": reason},
            duration_ms=int((time.time() - start) * 1000),
        )

    def _failed(self, code: str, message: str, start: float) -> DetectionResult:
        return DetectionResult(
            detector=DetectorType.VISUAL_SIMILARITY,
            status=DetectionStatus.FAILED,
            label="Error",
            score=0.0,
            error=DetectorError(code=code, message_id="visual_similarity_failed",
                                details={"error": message}),
            duration_ms=int((time.time() - start) * 1000),
        )
