# Tests

Hanya tes pytest yang ada di folder ini. Jalankan dari root repo:

```bash
pytest
```

| File | Isi |
|---|---|
| `test_det01_url_pattern.py` | **DET-01**: URL judi harus "High Risk", URL sah harus "Normal" |
| `test_det02_visual_similarity.py` | **DET-02**: pencocokan pHash dengan indeks referensi |
| `test_det03_ocr.py` | **DET-03**: OCR pada screenshot (butuh Tesseract) |
| `test_det04_text_keyword.py` | **DET-04**: normalizer dan deteksi kata kunci |
| `test_sample_cases.py` | **Contoh kasus berbasis PRD** (URL, teks, gambar, validasi input) beserta hasil yang diinginkan. Jalankan `python tests/test_sample_cases.py` untuk tabel harapan vs hasil |
| `test_pipeline.py` | Skor gabungan, Rendah/Sedang/Tinggi, timeout detektor |
| `test_detection.py` | Pipeline dan detektor individual |
| `simple_test.py` | Smoke test dasar |

## Data nyata (`data/samples/`)

Tes DET-01 sampai DET-04 membaca contoh sungguhan dari `data/samples/` bila folder itu ada, dan melewatinya bila tidak. Folder ini **tidak ikut git** (screenshot situs judi, bisa besar).

```
data/samples/
  manifest.json               # daftar halaman: label, url, status
  urls.csv                    # URL berlabel (python scripts/build_urls_csv.py)
  teks/<nama>.txt             # teks halaman (DET-04)
  ocr/judi|normal|mirip_tapi_bukan/<nama>.png   # screenshot (DET-02, DET-03)
```

Label `mirip_tapi_bukan` berarti halaman yang *membahas* judi (berita, edukasi) tetapi bukan situs judi. `tests/samples.py` memuat datanya dan menyaring halaman yang bukan konten asli (diblokir bot, verifikasi, 404).

Tiap file DET punya mode `--samples` yang mencetak hasil per halaman, misalnya `python tests/test_det04_text_keyword.py --samples`. Ringkasan semua modul sekaligus: `python scripts/evaluate_samples.py`.

Kelemahan yang terukur pada data nyata ditandai `xfail` dengan alasan dan angkanya, jadi tetap terlihat lewat `pytest -rx` tanpa membuat suite merah.

Skrip demo (hanya mencetak hasil, tanpa assert) ada di `scripts/demos/`.
Jalankan dari root repo, misalnya:

```bash
PYTHONPATH=. python scripts/demos/test_final.py
```
