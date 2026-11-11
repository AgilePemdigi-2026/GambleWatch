"""Reference index for DET-02 visual similarity.

The index holds a perceptual hash (pHash, 64 bits) for every reference image
of a known gambling site, and optionally a CLIP embedding. It is stored as a
`.npz` file and loaded with `allow_pickle=False`, so loading an index can
never execute code.
"""

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import numpy as np

try:
    import imagehash
    from PIL import Image
    HASH_AVAILABLE = True
except ImportError:  # pragma: no cover - depends on the environment
    imagehash = None
    Image = None
    HASH_AVAILABLE = False

logger = logging.getLogger(__name__)

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png"}


def compute_phash_bits(image: "Image.Image") -> np.ndarray:
    """64-element uint8 array of the image's pHash bits."""
    return np.array(imagehash.phash(image.convert("RGB"), hash_size=8).hash,
                    dtype=np.uint8).flatten()


@dataclass
class ReferenceIndex:
    """Reference images known to belong to gambling sites."""
    phashes: np.ndarray = field(default_factory=lambda: np.zeros((0, 64), dtype=np.uint8))
    metadata: List[Dict[str, Any]] = field(default_factory=list)
    embeddings: Optional[np.ndarray] = None
    model_name: Optional[str] = None

    def __len__(self) -> int:
        return len(self.metadata)

    def save(self, path: Union[str, Path]) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        arrays: Dict[str, Any] = {
            "phashes": self.phashes,
            "metadata": np.array(json.dumps(self.metadata, ensure_ascii=False)),
            "model_name": np.array(self.model_name or ""),
        }
        if self.embeddings is not None:
            arrays["embeddings"] = self.embeddings
        np.savez_compressed(path, **arrays)

    @classmethod
    def load(cls, path: Union[str, Path]) -> "ReferenceIndex":
        with np.load(Path(path), allow_pickle=False) as data:
            return cls(
                phashes=data["phashes"],
                metadata=json.loads(str(data["metadata"])),
                embeddings=data["embeddings"] if "embeddings" in data.files else None,
                model_name=str(data["model_name"]) or None,
            )

    def add(self, image: "Image.Image", metadata: Dict[str, Any],
            embedding: Optional[np.ndarray] = None) -> None:
        self.phashes = np.vstack([self.phashes, compute_phash_bits(image)])
        self.metadata.append(metadata)
        if embedding is not None:
            vector = embedding[np.newaxis, :]
            self.embeddings = vector if self.embeddings is None else np.vstack(
                [self.embeddings, vector])

    @classmethod
    def build_from_directory(cls, image_dir: Union[str, Path],
                             metadata_file: Optional[Union[str, Path]] = None,
                             embedder: Optional["ClipEmbedder"] = None,
                             limit: int = 1000) -> "ReferenceIndex":
        """Build an index from every JPG/PNG in `image_dir`.

        `metadata_file` is an optional JSON object mapping filename to extra
        fields (type, category, risk_level, ...).
        """
        if not HASH_AVAILABLE:
            raise RuntimeError("Install Pillow and imagehash to build the index")

        image_dir = Path(image_dir)
        if not image_dir.is_dir():
            raise FileNotFoundError(f"Image directory not found: {image_dir}")

        extra: Dict[str, Any] = {}
        if metadata_file and Path(metadata_file).exists():
            extra = json.loads(Path(metadata_file).read_text(encoding="utf-8"))

        files = sorted(p for p in image_dir.iterdir() if p.suffix.lower() in IMAGE_SUFFIXES)
        index = cls(model_name=embedder.model_name if embedder else None)
        for path in files[:limit]:
            try:
                with Image.open(path) as image:
                    image.load()
                    embedding = embedder.embed(image) if embedder else None
                    info = {"id": path.stem, "filename": path.name,
                            "type": "unknown", "category": "unknown",
                            "risk_level": "unknown", **extra.get(path.name, {})}
                    index.add(image, info, embedding)
            except Exception as e:
                logger.error("Skipping %s: %s", path.name, e)
        return index


class ClipEmbedder:
    """Optional CLIP image embedder (needs torch + transformers and a model download)."""

    def __init__(self, model_name: str = "openai/clip-vit-base-patch32"):
        import torch
        from transformers import CLIPModel, CLIPProcessor

        self.model_name = model_name
        self._torch = torch
        self._model = CLIPModel.from_pretrained(model_name).eval()
        self._processor = CLIPProcessor.from_pretrained(model_name)

    def embed(self, image: "Image.Image") -> np.ndarray:
        """L2-normalised embedding, so a dot product is cosine similarity."""
        with self._torch.no_grad():
            inputs = self._processor(images=image.convert("RGB"), return_tensors="pt")
            vector = self._model.get_image_features(**inputs)[0].cpu().numpy()
        return (vector / np.linalg.norm(vector)).astype(np.float32)
