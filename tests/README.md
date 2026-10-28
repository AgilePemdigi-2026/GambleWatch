# Tests

Hanya tes pytest yang ada di folder ini. Jalankan dari root repo:

```bash
pytest
```

| File | Isi |
|---|---|
| `test_url_pattern.py` | DET-01: URL judi harus "High Risk", URL sah harus "Normal" |
| `test_text_detection.py` | DET-04: normalizer (leetspeak, spaced letters) dan deteksi kata kunci |
| `test_visual_detection.py` | DET-02: pencocokan pHash, indeks referensi |
| `test_pipeline.py` | Skor gabungan, Rendah/Sedang/Tinggi, timeout detektor |
| `test_detection.py` | Pipeline dan detektor individual |
| `simple_test.py` | Smoke test dasar |

Skrip demo (hanya mencetak hasil, tanpa assert) ada di `scripts/demos/`.
Jalankan dari root repo, misalnya:

```bash
PYTHONPATH=. python scripts/demos/test_final.py
```
