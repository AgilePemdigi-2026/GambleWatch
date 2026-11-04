# PRD GambleWatch

Referensi untuk mesin deteksi dan sprint berikutnya. Disusun dari dua sumber milik tim:
**(A)** dokumen `PRD GambleWatch.md` (13 fitur, turunan SRS 4.1-4.13) dan **(B)** poster PRD
Sprint Planning 1 serta sheet backlog sprint. Bila keduanya berbeda, lihat bagian
"Perbedaan antar sumber" di bawah.

## A. Ringkasan produk

GambleWatch adalah aplikasi web yang membantu Komdigi mendeteksi, memverifikasi, dan memantau
situs yang terindikasi judi online. Laporan masyarakat (URL atau screenshot) dan hasil web
scraping dianalisis dengan model ML/NLP/DL, lalu diberi tingkat indikasi **Rendah, Sedang, atau Tinggi**.

Masalah yang diselesaikan: penanganan situs judi online saat ini masih bergantung pada patroli
manual analis siber dan pencatatan di spreadsheet. Cara ini lambat, sulit ditelusuri, dan tidak
memberi kabar balik ke masyarakat yang melapor.

GambleWatch berperan sebagai **alat pendukung keputusan**. Sistem tidak memblokir situs secara
otomatis; keputusan dan pelaksanaan pemblokiran tetap ada di pihak berwenang.

## B. Tujuan dan metrik keberhasilan

Tujuan utama: mempercepat penyaringan situs judi online sehingga Admin Komdigi cukup memverifikasi
laporan berindikasi tinggi, bukan memeriksa semua situs secara manual.

| Tujuan | Metrik keberhasilan |
| --- | --- |
| Masyarakat mudah melapor | Laporan URL/screenshot terkirim dan tervalidasi (JPG/PNG, maks. 5 MB) |
| Analisis otomatis | Hasil indikasi keluar dalam 1-10 menit per pemindaian |
| Hasil analisis bisa dipertanggungjawabkan | Setiap hasil memuat skor probabilitas, URL Pattern, Visual Similarity, OCR, dan Keyword Analysis |
| Verifikasi admin lebih terarah | Laporan berindikasi Tinggi muncul di antrean verifikasi dashboard |
| Transparansi ke pelapor | Status tindak lanjut (Pending, Under Review, Blocked, No Action Needed) terlihat di My Analyses |
| Pemantauan berkelanjutan | Status scraping (Success, In Progress, Failed) dan early warning tampil di dashboard admin |

## C. Pengguna dan peran

Dua peran dalam satu aplikasi web dengan role-based access. Proses otomatis (scraping, deteksi,
klasifikasi) berjalan di belakang layar dan bukan peran pengguna.

| Peran | Kebutuhan utama | Akses | Perangkat |
| --- | --- | --- | --- |
| Masyarakat | Mengecek dan melaporkan situs yang dicurigai, lalu memantau status laporannya | Hanya data dan laporan milik sendiri | Smartphone atau PC, dipakai sesekali |
| Admin Komdigi | Memverifikasi laporan, memperbarui status blokir, memantau scraping dan early warning | Seluruh data laporan | Komputer kerja, dipakai rutin |

## D. Ruang lingkup fitur (dokumen A, 13 fitur)

Prioritas adalah usulan urutan pengerjaan: High = inti MVP, Medium = pelengkap, Low = bisa menyusul.

| No | Fitur | Peran | Ringkasan | Prioritas |
| --- | --- | --- | --- | --- |
| F1 | Login | Semua | Autentikasi, arahkan ke halaman sesuai role | High |
| F2 | Landing Page | Publik | Pengantar sistem, tombol Sign Up dan Sign In | Medium |
| F3 | Halaman About | Publik | Tujuan sistem, alur kerja, arti tingkat indikasi | Low |
| F4 | Form Analisis dan Hasil Indikasi | Masyarakat | Input URL atau upload screenshot, analisis otomatis, hasil Rendah/Sedang/Tinggi + skor per modul, opsi Save to History & Alert Admin | High |
| F5 | Riwayat dan Status Analisis | Masyarakat | Daftar analisis di My Analyses beserta status tindak lanjut | High |
| F6 | Kirim Feedback | Masyarakat | Kategori Laporan Bug, Saran Fitur, atau Laporan Data; maks. 500 karakter | Low |
| F7 | Dashboard Admin | Admin | Ringkasan jumlah laporan, antrean verifikasi, scraping, early warning, feedback | High |
| F8 | Hasil Klasifikasi Masyarakat | Admin | Semua hasil analisis dengan filter, detail, dan bukti | High |
| F9 | Verifikasi Laporan | Admin | Putuskan laporan berindikasi tinggi: terbukti atau tidak terbukti | High |
| F10 | Update Status Blokir | Admin | Ubah status ke Pending, Under Review, Blocked, atau No Action Needed | High |
| F11 | Monitoring Web Scraping | Admin | Pantau situs terdeteksi, waktu, dan status scraping; Run New Scan | Medium |
| F12 | Early Warning | Admin | Peringatan saat indikasi situs naik, beserta tren dan bukti; Run New Analysis | Medium |
| F13 | Hasil Feedback | Admin | Lihat dan tinjau feedback masyarakat | Low |

## E. Alur utama

Alur laporan sampai status blokir (7 langkah). Sistem hanya menyaring dan memberi skor; Admin
Komdigi yang memutuskan status. Di luar alur ini, scraping terjadwal terus memantau situs dan
memicu early warning saat indikasi suatu situs naik.

## F. Kebutuhan non-fungsional dan teknologi

| Aspek | Kebutuhan |
| --- | --- |
| Performa | Pemindaian selesai dalam 1-10 menit; scraping dan inferensi berjalan di background agar UI tidak macet |
| Keamanan | HTTPS (TLS), role check di frontend dan server, aturan keamanan database, scraping di sandbox terisolasi |
| Data | Upload hanya JPG/PNG maks. 5 MB; feedback maks. 500 karakter; laporan, bukti, dan status tidak boleh hilang |
| Portabilitas | Chrome, Firefox, Edge, dan Safari versi terbaru, desktop maupun mobile |
| Maintainability | Modul analisis, scraping, dan early warning bisa dikembangkan dan diuji terpisah |

| Lapisan | Teknologi (dokumen A, ditulis saat masih Firebase) |
| --- | --- |
| Frontend | Next.js (React) + Tailwind CSS |
| Backend/API | Server terpisah (VM atau container), API JSON, upload via multipart/form-data |
| Data dan auth | Autentikasi, database, dan penyimpanan file (screenshot dan bukti). **Kini dipindah dari Firebase ke Supabase.** |
| Analisis | Scraper (Playwright, Selenium, atau Scrapy), OCR, model ML/NLP/DL, Keyword Database (sinkron tiap 15 menit) |
| Integrasi eksternal | TrustPositif API (Komdigi) untuk cek riwayat blokir |

## G. Di luar ruang lingkup, asumsi, dan risiko

Di luar ruang lingkup:
- Pemblokiran situs secara otomatis; sistem hanya mencatat status tindak lanjut
- Aplikasi mobile native; akses cukup lewat browser

Asumsi: pengguna sudah punya akun terdaftar, model sudah dilatih dengan data yang cukup
representatif, dan admin memperbarui status laporan secara berkala.

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Situs target memakai proteksi (mis. Cloudflare) | Scraping gagal | Catat sebagai FAILED di Monitoring, tetap bisa analisis lewat screenshot |
| Situs judi memuat skrip berbahaya | Server backend terancam | Scraping dijalankan di sandbox terisolasi |
| Akses TrustPositif API tidak tersedia | Cek riwayat blokir tidak jalan | Klasifikasi tetap jalan tanpa skor riwayat, ditinjau ulang oleh admin |
| Model salah klasifikasi (false positive/negative) | Laporan salah prioritas | Hasil hanya informasi awal, keputusan akhir di verifikasi admin |

## H. Poster PRD Sprint Planning 1 (sumber B)

Judul: "Product Requirements Document (PRD), Pembangunan Perangkat Lunak, Sprint Planning 1,
Minggu ke-10, Universitas Airlangga". Tim pengembang: Rahmadevi Shetyaning Utamy, Radhitya
Prasetyadi Wahana, Rafael Evan Moses Ambarita, Revaldo Dave Chandra. Motto: "Deteksi lebih cepat,
cegah lebih baik."

Pengguna: Masyarakat, Admin, dan Sistem (menjalankan deteksi multi-modal, web scraping, monitoring).

**15 fitur utama:** Setup Project & Firebase; Sign Up & Sign In; Landing Page; About; Form Analisis
Situs & Hasil Indikasi; Mesin Deteksi Multi-Modal (URL pattern, image similarity, OCR, analisis
teks); Riwayat & Update Status Analisis; Kirim Feedback; Dashboard Admin; Hasil Klasifikasi
Masyarakat; Verifikasi Laporan Masyarakat; Update Status Blokir Situs; Automatic Web Scraping &
Monitoring; Early Warning Indikasi Situs; Lihat Feedback Masyarakat.

**Rencana sprint:**
- Sprint 1 (Minggu ke-10): setup project dan folder, Firebase Auth/Firestore/Storage, Sign Up &
  Sign In (masyarakat dan admin), Landing Page, UI tampilan halaman utama.
- Sprint 2 (Minggu ke-11): About, Riwayat & Update Status Analisis, Early Warning, Update Status
  Blokir, Hasil Klasifikasi Masyarakat.
- Sprint 3 (Minggu ke-12): Kirim Feedback, Lihat Feedback Masyarakat (admin).

**Kebutuhan non-fungsional (poster):** waktu respons analisis <= 30 detik (target), skalabilitas,
keamanan (autentikasi, enkripsi data), usability sederhana, reliability 24/7, kompatibilitas
browser modern dan perangkat mobile.

**Data dan integrasi (poster):** input berupa URL situs, laporan masyarakat, feedback; output berupa
hasil deteksi, status situs, riwayat analisis, klasifikasi; database Cloud Firestore dan storage
untuk gambar/screenshot (kini Supabase); Next.js untuk frontend, Node.js/Nest.js untuk backend,
Python untuk deteksi multi-modal.

**Risiko (poster):** instalasi Tesseract OCR dan dependensi Python di Windows (solusi: Tesseract
manual, PATH); butuh GPU untuk CLIP (solusi: CPU-only); kurang dataset berlabel situs judi
Indonesia, minim gambar referensi (solusi: kumpulkan 50-100 URL, kumpulkan data bertahap);
integrasi Next.js dan Python (solusi: FastAPI sebagai service terpisah); fokus MVP pada DET-01 dan
DET-04 lebih dulu.

**Kriteria penerimaan (poster, ringkas):** Sign Up/Sign In berhasil dan diarahkan sesuai role;
landing page tampil dengan navigasi jelas; form analisis menerima URL dan menampilkan hasil
indikasi (data dummy di Sprint 1); dashboard admin menampilkan laporan; verifikasi laporan
mengubah status; update status blokir tersimpan di database; riwayat analisis sesuai pengguna;
feedback bisa dikirim dan dilihat.

## I. Backlog sprint (sheet, kolom ID, PIC, prioritas, status)

Status di bawah dibaca dari tangkapan layar sheet pada 28/10/2026; sudah berubah sejak itu.
Semua baris berprioritas Must Have.

| ID | Backlog | PIC | Status (28/10) |
| --- | --- | --- | --- |
| SET-02, SET-03 | Firebase Auth, Firestore dan Storage (kini Supabase) | Radhitya | Selesai |
| AUTH-01..03 | UI dan Front End Sign Up / Sign In | Revaldo | Selesai |
| AUTH-04, AUTH-05 | Back End autentikasi dan integrasi Firebase | Vivi (Mingdep) | Belum Dimulai |
| LAND-01, LAND-02 | Landing Page | Revaldo | Selesai |
| ANL-01..05 | Form analisis situs dan hasil indikasi | Vivi (sebagian Mingdep) | Campuran |
| **DET-01** | Deteksi berdasarkan URL pattern | **ael (Rafael)** | Selesai |
| **DET-02** | Deteksi berdasarkan image similarity | **ael** | On Progress |
| **DET-03** | Deteksi menggunakan OCR | **ael** | On Progress |
| **DET-04** | Analisis teks | **ael** | Selesai |
| **DET-05** | Integrasi metode deteksi multi-modal | Revaldo (Mingdep) | Belum Dimulai |
| **DET-06** | Integrasi hasil deteksi dengan proses analisis situs | Revaldo (Mingdep) | Belum Dimulai |
| ADM-01..03 | Dashboard admin | Vivi, Revaldo (Mingdep) | Campuran |
| VER-01, VER-02 | Verifikasi laporan masyarakat | Radhitya | Campuran |

## J. Perbedaan antar sumber (perlu diputuskan tim)

- **Waktu analisis:** poster menyebut <= 30 detik, dokumen A menyebut 1-10 menit.
- **Jumlah fitur:** poster 15 fitur, dokumen A 13 fitur (penomoran berbeda).
- **Backend:** poster menyebut Node.js/Nest.js dan Python; dokumen A menyebut server terpisah (VM atau container) tanpa menyebut Node.
- **Tingkat indikasi:** dokumen A menetapkan Rendah/Sedang/Tinggi; batas angkanya tidak ditentukan di PRD manapun. Di kode batasnya Sedang >= 0.4 dan Tinggi >= 0.7 (`detection_engine/config/detection_config.py`).
- **TrustPositif API:** hanya ada di dokumen A, belum ada kodenya.
