"""Reference index for DET-02 visual similarity.

The index holds a perceptual hash (pHash, 64 bits) for every reference image
of a known gambling site, and optionally a CLIP embedding.

Reference images whose metadata says `"type": "situs_judi"` (the gambling site's own
page, not spam posted on a public platform) also get a pHash of the top band of the
page: the header and menu. That band stays the same while banners and carousels below
it rotate, so a fresh visit still matches. Spam on gitlab/gumroad/substack is left out,
because its header is the platform's header and would match every page there. It is stored as a
`.npz` file and loaded with `allow_pickle=False`, so loading an index can
never execute code.
"""

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Union

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


# Grayscale standard deviation (0-255) below which an image is treated as near-blank.
# Blank, white or single-colour screenshots all share the same pHash, so matching them
# would flag any empty page as "visually similar" to a gambling site.
MIN_CONTRAST = 12.0


def is_low_information(image: "Image.Image") -> bool:
    """True for near-blank images that carry no visual identity."""
    gray = np.asarray(image.convert("L").resize((256, 256)), dtype=np.float32)
    return float(gray.std()) < MIN_CONTRAST


# Height of the top band (header + menu) as a fraction of the page WIDTH, so the band
# covers the same part of the layout for every screenshot of the same width.
HEADER_RATIO = 0.12
# Only these references are compared by their header (see module docstring)
HEADER_TYPES = {"situs_judi"}


def header_band(image: "Image.Image") -> "Image.Image":
    """Top band of the page: header and main menu."""
    width, height = image.size
    return image.crop((0, 0, width, max(1, min(height, int(width * HEADER_RATIO)))))


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
    header_phashes: np.ndarray = field(default_factory=lambda: np.zeros((0, 64), dtype=np.uint8))
    header_mask: np.ndarray = field(default_factory=lambda: np.zeros(0, dtype=bool))

    def __len__(self) -> int:
        return len(self.metadata)

    def save(self, path: Union[str, Path]) -> None:
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        arrays: Dict[str, Any] = {
            "phashes": self.phashes,
            "metadata": np.array(json.dumps(self.metadata, ensure_ascii=False)),
            "model_name": np.array(self.model_name or ""),
            "header_phashes": self.header_phashes,
            "header_mask": self.header_mask,
        }
        if self.embeddings is not None:
            arrays["embeddings"] = self.embeddings
        np.savez_compressed(path, **arrays)

    @classmethod
    def load(cls, path: Union[str, Path]) -> "ReferenceIndex":
        with np.load(Path(path), allow_pickle=False) as data:
            phashes = data["phashes"]
            has_header = "header_phashes" in data.files   # indeks lama: tanpa header
            return cls(
                phashes=phashes,
                metadata=json.loads(str(data["metadata"])),
                embeddings=data["embeddings"] if "embeddings" in data.files else None,
                model_name=str(data["model_name"]) or None,
                header_phashes=(data["header_phashes"] if has_header
                                else np.zeros_like(phashes)),
                header_mask=(data["header_mask"].astype(bool) if has_header
                             else np.zeros(len(phashes), dtype=bool)),
            )

    def add(self, image: "Image.Image", metadata: Dict[str, Any],
            embedding: Optional[np.ndarray] = None) -> None:
        self.phashes = np.vstack([self.phashes, compute_phash_bits(image)])
        band = header_band(image)
        use_header = (metadata.get("type") in HEADER_TYPES
                      and not is_low_information(band))
        self.header_phashes = np.vstack([self.header_phashes, compute_phash_bits(band)])
        self.header_mask = np.append(self.header_mask, use_header)
        self.metadata.append(metadata)
        if embedding is not None:
            vector = embedding[np.newaxis, :]
            self.embeddings = vector if self.embeddings is None else np.vstack(
                [self.embeddings, vector])

    @classmethod
    def build_from_directory(cls, image_dir: Union[str, Path],
                             metadata_file: Optional[Union[str, Path]] = None,
                             embedder: Optional["ClipEmbedder"] = None,
                             limit: int = 1000,
                             skip_check: Optional[Callable[["Image.Image"], Optional[str]]] = None,
                             on_skip: Optional[Callable[[str, str], None]] = None) -> "ReferenceIndex":
        """Build an index from every JPG/PNG in `image_dir`.

        `metadata_file` is an optional JSON object mapping filename to extra
        fields (type, category, risk_level, ...).

        Images that would make every site look alike are left out: near-blank
        images and exact pHash duplicates always, plus anything `skip_check`
        rejects (it returns a reason, e.g. "halaman blokir Cloudflare"). Each
        skipped file is reported to `on_skip(filename, reason)`.
        """
        if not HASH_AVAILABLE:
            raise RuntimeError("Install Pillow and imagehash to build the index")

        image_dir = Path(image_dir)
        if not image_dir.is_dir():
            raise FileNotFoundError(f"Image directory not found: {image_dir}")

        extra: Dict[str, Any] = {}
        if metadata_file and Path(metadata_file).exists():
            extra = json.loads(Path(metadata_file).read_text(encoding="utf-8"))

        def skip(name: str, reason: str) -> None:
            logger.info("Skipping %s: %s", name, reason)
            if on_skip:
                on_skip(name, reason)

        files = sorted(p for p in image_dir.iterdir() if p.suffix.lower() in IMAGE_SUFFIXES)
        index = cls(model_name=embedder.model_name if embedder else None)
        seen: Dict[bytes, str] = {}
        for path in files[:limit]:
            try:
                with Image.open(path) as image:
                    image.load()
                    if is_low_information(image):
                        skip(path.name, "gambar hampir polos")
                        continue
                    bits = compute_phash_bits(image).tobytes()
                    if bits in seen:
                        skip(path.name, f"duplikat {seen[bits]}")
                        continue
                    reason = skip_check(image) if skip_check else None
                    if reason:
                        skip(path.name, reason)
                        continue
                    seen[bits] = path.name
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
