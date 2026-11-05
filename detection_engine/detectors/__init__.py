"""Multi-modal detectors for gambling content detection.

One folder per detector, numbered as in the SRS/backlog:

    det01_url_pattern/        DET-01  URL pattern rules (TLD, keywords, number patterns)
    det02_visual_similarity/  DET-02  Screenshot vs. reference index (pHash, optional CLIP)
    det03_ocr/                DET-03  Text from screenshot via Tesseract, scored by DET-04
    det04_text_keyword/       DET-04  Keyword matching on page text, with its own
                                      text_normalizer.py and keyword_provider.py

All detectors return a `DetectionResult` (see `detection_engine.models`) and are
run together by `detection_engine.pipeline.DetectionPipeline`.
"""
