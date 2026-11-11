-- Bukti deteksi lengkap per laporan (DET-01..04), dibaca halaman admin
-- (Tindak Lanjut & Status Pemblokiran). Diisi oleh form analisis dari hasil API DET-06.
-- Sudah dijalankan di Supabase 11/11/2026; aman dijalankan ulang.
--
-- Bentuk isi (lib/detection/analysis.ts, BuktiDeteksi):
-- {
--   "versi": 1, "request_id": "...", "dianalisis_pada": "2026-11-11T08:00:00.000Z",
--   "skor": 96.3, "indikasi": "Tinggi", "waktu_proses_ms": 1840,
--   "modul": { "url_pattern": {"status","label","skor","temuan":[...]}, "visual_similarity": {...},
--              "ocr": {...}, "keyword_analysis": {...} },
--   "potongan_teks": [ {"kalimat","highlight":[...],"kategori","sumber"} ],
--   "teks_ocr": "..." | null
-- }
alter table public.laporan_analisis
  add column if not exists bukti_deteksi jsonb;
