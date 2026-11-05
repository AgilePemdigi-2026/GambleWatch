# Konteks proyek GambleWatch (untuk sesi berikutnya)

Ringkasan keadaan proyek per **04/11/2026**, ditulis supaya orang atau sesi baru bisa melanjutkan
tanpa membaca riwayat percakapan. PRD lengkap dan backlog ada di `docs/PRD_GambleWatch.md`.

## Gambaran singkat
Aplikasi web untuk mendeteksi, memverifikasi, dan memantau situs judi online (untuk Komdigi).
Masyarakat melapor URL atau screenshot, sistem memberi tingkat indikasi **Rendah / Sedang / Tinggi**,
Admin memverifikasi. Sistem hanya menyaring dan memberi skor, tidak memblokir otomatis.

## Tim
- **Rafael** (git `Rafael22`, PIC "ael"): mesin deteksi DET-01 sampai DET-04, dan `pipeline.py` (DET-05).
- **Revaldo** (`Revaldo2201`): frontend sign-in dan landing, integrasi DET-05/DET-06 (`tests/test_multimodal_integration.py`).
- **Radhitya** (`ladhit-15`): Supabase (klien, halaman admin, verifikasi).
- **Vivi**: backend auth dan analisis, dashboard admin.

## Keadaan repo (setelah pemilik repo me-reset GitHub, 03/11/2026)
- `main` hanya satu commit `defb003` (Next.js + koneksi Supabase).
- Cabang `feature/detection-engine` (commit `4e2cb7b`) menambahkan seluruh mesin deteksi di atas `main` baru.
- Riwayat lama (sebelum reset) **tidak berhubungan** dengan `main` baru, jadi cabang lama tidak boleh
  di-merge atau di-pull ke repo ini. Riwayat itu tersimpan di folder lama `..\GambleWatch` dan dua cadangan.
- Folder: `app/`, `lib/` (frontend Next.js), `detection_engine/` (Python), `tests/`, `scripts/`, `docs/`,
  `supabase/` (SQL), `data/keywords.json`.

## Mesin deteksi (`detection_engine/`)
| Folder | Modul |
|---|---|
| `detectors/det01_url_pattern/` | DET-01 pola URL (TLD, kata kunci, pola angka, path) |
| `detectors/det02_visual_similarity/` | DET-02 kemiripan screenshot (pHash, CLIP opsional), indeks `.npz` |
| `detectors/det03_ocr/` | DET-03 OCR Tesseract, teks dinilai oleh DET-04 |
| `detectors/det04_text_keyword/` | DET-04 kata kunci, `text_normalizer.py`, `keyword_provider.py` |
| `pipeline.py` | menjalankan semua detektor paralel, membuat ringkasan |

- **Hasil:** `summary["indication"]` (Sedang >= 0.4, Tinggi >= 0.7), `overall_score`, dan `modules`
  (`url_pattern`, `visual_similarity`, `ocr`, `keyword_analysis`). Skor gabungan memakai noisy-OR; OCR dan
  kata kunci dihitung sekali (yang lebih kuat). Modul yang gagal atau dilewati tidak menggagalkan hasil.
- **DET-04** membedakan halaman yang *menjual* judi dari yang *membahas* judi: konteks informasional
  (>= 3 kata berita/penegakan hukum, <= 1 kata promosi) diredam kuat, sebutan sambil lalu di halaman panjang
  diredam, dan kumpulan kata ambigu (bobot < 0.5) tidak bisa menandai halaman. Fuzzy membandingkan kata utuh
  (panjang +-1 huruf), bukan potongan teks. Kata ambigu berbobot rendah: bola, ayam, bandar, gacor (0.3).
- **Kata kunci:** Supabase tabel `keywords` -> `data/keywords.json` -> seed bawaan, cache 15 menit.
  `.env.local` dimuat otomatis oleh `detection_engine/config/env.py` (nama `NEXT_PUBLIC_SUPABASE_URL` dan
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`); tes mematikannya lewat `tests/conftest.py` supaya tidak menyentuh jaringan.

## Menjalankan
- Semua tes: `python -m pytest` (tes data nyata di `data/samples/` dilewati bila folder tidak ada).
- Per detektor: `python tests/test_det04_text_keyword.py`; tambahkan `--samples` untuk hasil per halaman,
  atau beri teks, URL, atau gambar sendiri sebagai argumen. Ringkasan semua modul: `python scripts/evaluate_samples.py`.
- Cek koneksi Supabase: `python scripts/check_supabase.py`. Bangun indeks DET-02: `scripts/build_reference_index.py`.
- DET-03 butuh Tesseract 5.4 beserta data bahasa `ind` (lihat `docs/INSTALL_TESSERACT.md`).

## Status dan celah terukur
Diukur pada halaman nyata (himpunan kecil: 26 halaman awal, 14 halaman validasi):
- Halaman judi tertangkap 12 dari 13 (awal) dan 4 dari 4 (validasi). Berita tentang judi yang salah "Tinggi":
  dari 6 dari 6 menjadi 1 dari 6 (awal) dan 0 dari 5 (validasi).
- **Belum divalidasi pada halaman baru:** fuzzy per kata utuh, "gacor" 0.3, dan aturan kata lemah.
  Himpunan validasi ketiga baru 4 dari 26 halaman yang terambil; skrip pengambilnya hanya ada di sesi lama.
- DET-01: recall sekitar 52% untuk URL yang kata judinya terlihat (kata di path berbobot 0.4x).
- DET-02: pHash cocok 0 dari 3 pasangan halaman satu platform; belum ada gambar referensi sungguhan,
  jadi di praktik masih "skipped". CLIP belum diuji.
- DET-03: 10 dari 13 halaman judi terbaca (hanya layar pertama 1366x900 yang dibaca).
- Wikipedia "Perjudian" masih "Tinggi" (artikel ensiklopedis yang menguraikan semua jenis judi).
- Situs yang diretas melakukan *cloaking* (spam judi hanya untuk mesin pencari, 404 untuk browser biasa),
  jadi scraper biasa tidak melihatnya. Belum ada scraper di repo.

## Supabase
- Proyek `edcnjwycpxpifdcetkof`. Tabel `keywords` **belum dibuat**: jalankan `supabase/schema.sql`, lalu
  `supabase/seed_keywords.sql` di SQL Editor, kemudian `python scripts/check_supabase.py`.
- Tabel laporan `laporan_analisis` milik tim. RLS-nya belum diverifikasi; `middleware.ts` tidak melindungi
  `/admin`; peran admin dikirim dari form pendaftaran sehingga tidak boleh dipercaya untuk akses admin.
- Kunci hanya di `.env.local` (sudah di `.gitignore`).

## Lingkungan
- Windows + PowerShell, repo di dalam OneDrive. Tesseract ada di `C:\Program Files\Tesseract-OCR`.
- `.venv` belum ada di folder ini; yang lama ada di `..\GambleWatch\.venv`.
- Tidak ikut git dan hanya ada di folder lama `..\GambleWatch`: `data/samples/` (77 teks, 62 screenshot situs judi)
  dan `.env.local`. Salin bila perlu.
- Cadangan penuh: `C:\Users\User\GambleWatch-backup` dan `..\GambleWatch-backup` (git bundle + salinan folder).

## Sprint 2 (menurut PRD poster)
About, Riwayat & Update Status Analisis, Early Warning, Update Status Blokir, Hasil Klasifikasi Masyarakat.
Terkait mesin deteksi: API antara Next.js dan Python (FastAPI) untuk DET-05/06, gambar referensi DET-02,
scraper, dan validasi ulang DET-04 pada halaman baru.
