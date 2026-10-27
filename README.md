# GambleWatch Detection Engine

Multi-modal detection engine for identifying online gambling content. This is a Python-based backend service that implements four detection methods (DET-01 to DET-04) as specified in the SRS.

## Features

### ✅ **DET-01: URL Pattern Detection**
- Lexical analysis with weighted rule engine
- Gambling TLD detection (.bet, .casino, .win, etc.)
- Keyword matching in domain/path/query
- Indonesian-specific patterns (slot88, togel88, etc.)
- Structure analysis (entropy, hyphen/digit excess, punycode)

### ✅ **DET-04: Text/Keyword Detection**
- Text normalization (NFKC, lowercase, leetspeak substitution)
- Fuzzy matching with RapidFuzz
- Keyword provider with Firestore caching + local fallback
- Weighted scoring with categories and snippets

### ✅ **DET-03: OCR Detection**
- Text extraction from images using Tesseract
- Image preprocessing for better OCR
- Reuses DET-04 for keyword detection
- Indonesian language support

### 🔄 **DET-02: Visual Similarity Detection** (Pending)
- pHash for near-duplicate detection
- CLIP embeddings for semantic similarity
- Reference index interface

### ✅ **Pipeline**
- Concurrent execution of all detectors
- Failure isolation (one detector failing doesn't affect others)
- Timeout management per detector
- Structured results with parameter breakdown

## Installation

### Prerequisites

1. **Python 3.11+**
2. **Tesseract OCR** (for DET-03):
   ```bash
   # Windows (using Chocolatey)
   choco install tesseract
   
   # Or download from: https://github.com/UB-Mannheim/tesseract/wiki
   ```

### Install Python Dependencies

```bash
pip install -r requirements.txt
```

### Optional Dependencies

For Firebase integration (KeywordProvider):
```bash
# Set up Firebase Admin SDK
# 1. Download service account key from Firebase Console
# 2. Set GOOGLE_APPLICATION_CREDENTIALS environment variable
```

For OCR with better accuracy:
```bash
# Install Indonesian language data for Tesseract
# Download from: https://github.com/tesseract-ocr/tessdata
# Place ind.traineddata in Tesseract's tessdata directory
```

## Quick Start

### Basic Usage

```python
from detection_engine import detect

# Example input
input_data = {
    "url": "https://slotgacor88.bet",
    "scraped": {
        "page_text": "Slot online gacor dengan bonus deposit 100%",
        "title": "Slot Gacor 88 - Judi Online Terpercaya",
    }
}

# Run detection
result = detect(input_data)
print(f"Request ID: {result['request_id']}")
print(f"Overall Risk: {result['summary']['overall_risk']}")
```

### Individual Detectors

```python
from detection_engine.detectors.url_pattern.url_pattern_detector import URLPatternDetector
from detection_engine.detectors.text_keyword.text_keyword_detector import TextKeywordDetector

# URL Pattern Detection
url_detector = URLPatternDetector()
url_result = url_detector.detect("https://slotgacor88.bet")
print(f"Label: {url_result.label}, Score: {url_result.score}")

# Text Keyword Detection
text_detector = TextKeywordDetector()
text_result = text_detector.detect("Slot online gacor dengan bonus deposit")
print(f"Keywords Found: {text_result.evidence['matches_found']}")
```

### Running Tests

```bash
python test_detection.py
```

## Project Structure

Repository layout:

```
app/                 # Next.js frontend (App Router pages)
  components/        # Shared UI (AuthForm, ComingSoon)
lib/                 # Frontend helpers (firebase.ts, detection.ts = DET-01 port)
public/              # Static assets
detection_engine/    # Python detection engine (see below)
data/                # keywords.json and other data files
tests/               # pytest suite (run: pytest)
scripts/             # Setup, dependency checks, evaluation, index building
  demos/             # Print-only demo scripts (not part of the test suite)
docs/                # Deployment guide, Tesseract install notes
```

Detection engine:

```
detection_engine/
├── __init__.py              # Main entry point
├── models/
│   ├── __init__.py
│   └── detection_models.py  # Pydantic models (DetectionInput, DetectionResult, etc.)
├── config/
│   ├── __init__.py
│   └── detection_config.py  # Timeouts, thresholds, configuration
├── validation/
│   ├── __init__.py
│   └── input_validator.py   # Input validation with Indonesian error messages
├── text/
│   ├── __init__.py
│   └── text_normalizer.py   # Text normalization for DET-04
├── providers/
│   ├── __init__.py
│   └── keyword_provider.py  # Keyword provider with Firestore + local cache
├── detectors/
│   ├── url_pattern/         # DET-01
│   │   ├── __init__.py
│   │   └── url_pattern_detector.py
│   ├── text_keyword/        # DET-04
│   │   ├── __init__.py
│   │   └── text_keyword_detector.py
│   ├── ocr/                 # DET-03
│   │   ├── __init__.py
│   │   └── ocr_detector.py
│   └── visual/              # DET-02 (pending)
│       └── __init__.py
└── pipeline.py              # Orchestrates all detectors
```

## Configuration

Edit `detection_engine/config/detection_config.py` to customize:

```python
# Timeouts (seconds)
url_pattern_timeout = 1.0
text_keyword_timeout = 2.0
ocr_timeout = 30.0
visual_similarity_timeout = 15.0

# Thresholds
url_pattern_high_risk_threshold = 0.6
text_keyword_score_threshold = 0.3

# Image constraints
max_image_size_mb = 5
max_image_dimension = 4096

# Keyword provider
keyword_cache_ttl_minutes = 15
keyword_local_fallback_path = "data/keywords.json"
```

## Input Format

```python
{
    "url": "https://example.com",          # Required if no screenshot
    "screenshot": "path/to/image.jpg",     # Required if no URL
    "scraped": {                           # Optional
        "page_text": "Full page text",
        "title": "Page title",
        "meta": {"description": "..."},
        "links": ["https://link1", "https://link2"],
        "media_urls": ["https://image1.jpg"]
    }
}
```

## Output Format

```python
{
    "request_id": "uuid",
    "results": [
        {
            "detector": "url_pattern",
            "status": "ok",  # ok, skipped, failed
            "label": "High Risk Pattern",
            "score": 0.85,   # 0..1
            "evidence": {...},
            "duration_ms": 150
        }
        # ... other detectors
    ],
    "summary": {
        "overall_risk": "high",
        "successful": 3,
        "failed": 0,
        "skipped": 1
    },
    "label_breakdown": {
        "url_pattern": "High Risk Pattern",
        "visual_match": "Skipped",
        "ocr": "Clear",
        "keywords": ["slot", "gacor", "deposit"]
    }
}
```

## Development

### Adding Custom Keywords

```python
from detection_engine.providers.keyword_provider import KeywordProvider, GamblingKeyword

provider = KeywordProvider()

# Add keyword
keyword = GamblingKeyword(
    term="new_keyword",
    category="custom",
    weight=0.8,
    active=True,
    language="id"
)
provider.add_keyword(keyword)
```

### Extending URL Patterns

Edit `detection_engine/detectors/url_pattern/url_pattern_detector.py`:

```python
# Add to GAMBLING_TLDS list
GAMBLING_TLDS = [
    # ... existing TLDs
    '.newtld',
]

# Add to GAMBLING_KEYWORDS_ID list
GAMBLING_KEYWORDS_ID = [
    # ... existing keywords
    ('new_keyword', 0.7, 'category'),
]
```

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-cov

# Run tests
pytest tests/ -v

# With coverage
pytest tests/ --cov=detection_engine --cov-report=html
```

## API Integration

### FastAPI Example

```python
from fastapi import FastAPI
from pydantic import BaseModel
from detection_engine import detect

app = FastAPI()

class DetectionRequest(BaseModel):
    url: str | None = None
    screenshot: str | None = None
    scraped: dict | None = None

@app.post("/detect")
async def detect_endpoint(request: DetectionRequest):
    return detect(request.dict())
```

## Deployment Considerations

1. **Security**: Treat all input as untrusted. Never execute HTML/JS from scraped content.
2. **Performance**: The pipeline runs detectors concurrently. Monitor timeouts and resource usage.
3. **Scalability**: Consider Redis for keyword cache if using multiple instances.
4. **Monitoring**: Use structured logging (`structured_logging: true` in config) for monitoring.

## License

This project is part of GambleWatch - Komdigi's online gambling detection system.