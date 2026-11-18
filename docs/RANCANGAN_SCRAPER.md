# Rancangan Teknis: Penemuan Situs & Web Scraping (Sprint 3)

Status: **draf untuk didiskusikan tim**. Disusun 10/11/2026.
Fitur PRD yang dilayani: **F11 Monitoring Web Scraping**, **F12 Early Warning**, dan form analisis
(F4) yang sekarang hanya menjalankan DET-01 bila pengguna mengisi URL saja.

---

## 1. Tujuan

1. **Analisis URL lengkap dari form.** Bila pengguna hanya mengisi URL, sistem mengambil sendiri
   teks dan screenshot halaman, lalu menjalankan DET-01 sampai DET-04 (bukan DET-01 saja).
2. **Penemuan otomatis.** Sistem mencari sendiri situs judi baru di internet berdasarkan kata kunci
   di tabel `keywords`, tanpa menunggu laporan masyarakat.
3. **Pemantauan berkelanjutan.** Situs yang sudah ditemukan di-scan ulang berkala; kenaikan skor
   memicu Early Warning.

Prinsip dari PRD yang tetap berlaku: sistem **hanya menyaring dan memberi skor**; keputusan
(terbukti, blokir) tetap di tangan Admin Komdigi.

### Di luar ruang lingkup

- Login, mendaftar, mengisi form, atau deposit di situs judi.
- Menembus CAPTCHA atau proteksi bot (Cloudflare dsb.). Situs yang terlindungi dicatat `FAILED`.
- Men-scrape halaman hasil Google/Bing secara langsung (melanggar ketentuan layanan).
- Pemblokiran otomatis.

---

## 2. Gambaran arsitektur

```
                          tabel keywords (Supabase, bobot >= 0.5 = "jangkar")
                                         |
        +---------------+----------------+----------------+------------------+
        v               v                v                v                  v
   CertStream        crt.sh         Common Crawl     Laporan +          (opsional)
   (real-time)     (berkala)        (berkala)       link alternatif    SearXNG/Brave
        |               |                |           (bola salju)            |
        +---------------+-------+--------+----------------+------------------+
                                v
                    discovered_urls  (normalisasi, hapus duplikat, whitelist)
                                v
                    pra-skor DET-01 dari URL (+ DET-04 dari snippet bila ada)
                                v   hanya yang >= ambang
                    scrape_jobs (antrean)  <---  form analisis (URL dari pengguna)
                                v
                    scraper-worker (Playwright, container terisolasi)
                                v
                    pipeline DET-01..04  ->  scrape_results + site_scores
                                v
              Monitoring (F11)  |  Early Warning (F12)  |  Verifikasi Admin (F9)
```

Semua komponen di sisi server berjalan di **VPS** (lihat §10). Next.js tetap di Vercel dan
memanggil API lewat HTTPS.

| Komponen | Folder (rencana) | Tugas |
|---|---|---|
| `detection-api` | `detection_engine/api/` (sudah ada) | DET-06: `/analyze`, plus endpoint scraping baru (§7) |
| `discovery` | `detection_engine/discovery/` | Mengambil kandidat URL dari tiap sumber, menormalkan, pra-skor |
| `scraper-worker` | `detection_engine/scraper/` | Mengambil job dari antrean, membuka halaman, menjalankan pipeline |
| `scheduler` | `detection_engine/scheduler/` | Menjalankan discovery dan scan ulang berkala |

---

## 3. Sumber penemuan URL

Semua sumber di bawah **gratis**. Yang berbayar hanya API mesin pencari (opsional, §3.5).

### 3.1 crt.sh (Certificate Transparency, berkala)

Setiap situs HTTPS wajib punya sertifikat, dan semua sertifikat dicatat di log publik. crt.sh
menyediakan pencarian nama domain dalam log itu.

- Query **awalan** per kata kunci: `https://crt.sh/?q=slotgacor%25&output=json&exclude=expired`
- **Hasil uji 10/11/2026:**
  - `slotgacor%` → 200 OK dalam 36 detik, **3.136 nama domain**, sebagian besar subdomain
    `*.pages.dev` (Cloudflare Pages), mis. `slotgacor-001.pages.dev`.
  - `%gacor%` (substring) → **502 setelah 60 detik**. Pencarian substring terlalu berat; jangan dipakai.
  - `weton88%` langsung 502, kemungkinan karena dibatasi setelah query sebelumnya.
- Batas kecepatan tidak didokumentasikan resmi. Komunitas menyarankan jeda **≥ 15 detik**
  antar-request. Timeout 90 detik, coba ulang dengan jeda bertambah (backoff) bila 502/503.
- Cadangan bila crt.sh sering 502: Cert Spotter API (SSLMate).
- Kekurangan: hanya menemukan domain yang **diawali** kata kunci.

### 3.2 CertStream (Certificate Transparency, real-time)

Aliran semua sertifikat baru secara real-time. Di sini pencocokan **substring** dilakukan sendiri
oleh kita, jadi `situs-slotgacor88.com` atau `link-alexis17.xyz` tetap tertangkap.

- Setiap nama domain langsung dinilai DET-01 (sangat cepat). Hanya yang mencurigakan disimpan.
- Layanan publik `certstream.calidog.io` belum tentu masih aktif (repo terakhir diperbarui 2024).
  Rencana: jalankan sendiri **certstream-server-go** sebagai container.
- Volume: jutaan sertifikat per hari, jadi penyaringan harus di memori dan murah.

### 3.3 Common Crawl (arsip web, berkala)

Arsip web gratis yang diperbarui beberapa minggu sekali (crawl terbaru saat ditulis:
`CC-MAIN-2026-43`). Cocok untuk spam judi yang **ditanam di situs `.go.id`, `.ac.id`, `.sch.id`
yang diretas**, termasuk yang melakukan *cloaking*.

- API CDX (`index.commoncrawl.org`) hanya mendukung pencocokan **domain/awalan**, bukan substring.
  Uji `url=*.go.id` → **504 timeout** (terlalu besar).
- Rencana: pakai **Columnar Index** (Parquet) dengan DuckDB, filter
  `url_host_tld = 'id' AND url_path LIKE '%slot%'` dsb. Teks halaman bisa diambil dari berkas WARC
  tanpa membuka situs aslinya.
- **Perlu diuji dulu** (fase 2): ukuran data besar, perlu dicek berapa lama dan berapa GB per query.

### 3.4 Laporan masyarakat + bola salju

- URL dari `laporan_analisis` menjadi titik awal.
- Saat men-scrape situs judi, kumpulkan link keluar yang mengarah ke domain lain, terutama yang
  berlabel "link alternatif", "daftar", "login". Situs judi hampir selalu punya domain cadangan.
- Batasi kedalaman (mis. 2 lompatan) dan hanya ikuti link dari halaman yang skornya Tinggi.

### 3.5 (Opsional) Mesin pencari

- Google Custom Search JSON API: **tertutup untuk pelanggan baru**, berhenti 1 Januari 2027.
- Bing Web Search API: **sudah dimatikan** 11 Agustus 2025.
- **Brave Search API**: masih ada. Menurut beberapa sumber sekitar $5/1.000 query dengan kredit
  gratis $5/bulan (≈1.000 query), wajib kartu kredit. **Cek harga resmi sebelum memakai.**
- **SearXNG** di-host sendiri: gratis tetapi tidak resmi, bisa diblokir mesin pencari. Pakai
  pelan-pelan, bukan sebagai sumber utama.
- Query yang paling berguna: `"slot gacor" site:go.id`, `"togel" site:ac.id`. Simpan **snippet**
  sebagai bukti, karena halaman yang di-cloaking sering 404 untuk browser biasa.

### 3.6 Menyusun query dari tabel `keywords`

- Pakai hanya kata kunci **jangkar** (bobot ≥ 0.5): "slot gacor", "togel hongkong", "weton88",
  "scatter hitam", dst. Kata ambigu (zeus, toto, mahjong) tidak dipakai sebagai query.
- Bentuk untuk crt.sh: hilangkan spasi (`slot gacor` → `slotgacor%`).
- Rotasi kata kunci per hari supaya batas kecepatan tidak terlampaui.
- Catat **hasil per kata kunci** (berapa situs baru yang akhirnya Tinggi). Kata kunci yang
  produktif diberi prioritas. Angka ini juga bahan evaluasi untuk paper.

---

## 4. Penyaringan dan pra-skor

Scraping mahal (5–30 detik per halaman), jadi kandidat disaring dulu:

1. **Normalisasi URL:** huruf kecil, buang `www.`, buang fragmen `#...` dan parameter pelacak
   (`utm_*`, `fbclid`), wildcard sertifikat `*.` dibuang.
2. **Hapus duplikat** per URL dan per domain (`discovered_urls` unik pada `url_normalized`).
3. **Whitelist** domain tepercaya yang hanya memberitakan judi (kompas.com, detik.com,
   wikipedia.org, *.go.id resmi, dst.) → dilewati, **kecuali** path-nya sendiri berskor DET-01 tinggi
   (indikasi spam yang ditanam).
4. **Sudah diblokir?** Bila halaman berisi penanda blokir (lihat `NOT_REAL_CONTENT` di
   `tests/samples.py`: "internet positif", "trustpositif", ...), catat status `BLOCKED`.
5. **Pra-skor:** DET-01 dari URL, ditambah DET-04 dari snippet bila sumbernya mesin pencari.
   Hanya yang skornya **≥ 0.4** (ambang Sedang) masuk antrean scrape.

---

## 5. Scraper (Playwright)

Dikembangkan dari `scripts/collect_samples.py`, dipindah menjadi modul
`detection_engine/scraper/`.

### 5.1 Pengaturan browser

| Pengaturan | Nilai | Alasan |
|---|---|---|
| Browser | Chromium headless, konteks baru per job | Tanpa cookie/login sisa job sebelumnya |
| Viewport | Desktop 1366×900; opsi mobile 390×844 | Banyak situs judi berbeda tampilan di mobile |
| Timeout muat | 30 detik; total job maks. 90 detik | PRD: pemindaian 1–10 menit |
| Unduhan | Ditolak | Situs judi bisa menyodorkan APK/berkas berbahaya |
| Popup / tab baru | Ditutup | |
| Ukuran halaman | Maks. ±10 MB | Mencegah halaman raksasa |
| Alamat tujuan | **Blokir IP privat/lokal** | Mencegah SSRF (§11) |

### 5.2 Data yang disimpan per halaman

- URL akhir setelah redirect, rantai redirect, kode HTTP
- Judul, teks yang terlihat (maks. 200.000 karakter, sama dengan batas API)
- Screenshot layar pertama (PNG)
- Link keluar (untuk bola salju), meta description
- Waktu muat, User-Agent yang dipakai
- Hasil pipeline DET-01..04 (ringkasan + `findings` per modul, sudah tersedia di `get_summary`)

### 5.3 Pengecekan cloaking

Situs yang diretas sering hanya menampilkan spam ke mesin pencari. Untuk kandidat dari
Common Crawl atau mesin pencari yang hasilnya 404/kosong di browser biasa, ambil sekali lagi
dengan header `Referer: https://www.google.com/` dan bandingkan. Bila berbeda, tandai
`cloaking = true` (bukti kuat situs diretas).

### 5.4 Kategori kegagalan

| Kode | Arti | Ditampilkan di Monitoring |
|---|---|---|
| `TIMEOUT` | Melewati batas waktu | FAILED |
| `DNS` | Domain tidak ditemukan / sudah mati | FAILED |
| `HTTP_4XX` / `HTTP_5XX` | Halaman error | FAILED |
| `BOT_PROTECTION` | Cloudflare / verifikasi manusia | FAILED ("Timeout atau proteksi Cloudflare" di Figma) |
| `BLOCKED` | Halaman blokir Internet Positif/TrustPositif | BLOCKED (bukan kegagalan: situs sudah diblokir) |
| `UNSAFE_TARGET` | URL mengarah ke IP privat/lokal | FAILED, tidak pernah dibuka |

---

## 6. Antrean dan status

Antrean disimpan di tabel Supabase `scrape_jobs` (bukan FastAPI BackgroundTasks), supaya job
tidak hilang saat server restart dan halaman Monitoring bisa membacanya langsung.

```
PENDING --> IN_PROGRESS --> SUCCESS
                        \-> FAILED   (attempts < 3: kembali ke PENDING dengan jeda)
                        \-> BLOCKED
```

- Worker mengambil job dengan `select ... for update skip locked` (lewat fungsi RPC Postgres)
  supaya dua worker tidak mengambil job yang sama.
- Job `IN_PROGRESS` lebih dari 10 menit dianggap macet dan dikembalikan ke `PENDING`.
- Prioritas: job dari **form pengguna** > scan ulang situs Tinggi > kandidat discovery.
- Status di Figma "Web Scraping Monitor" (SUCCESS, IN PROGRESS, FAILED) dipetakan langsung;
  `BLOCKED` ditambahkan.

---

## 7. API (FastAPI, `detection_engine/api/`)

Semua endpoint baru memerlukan header `X-API-Key` (rahasia bersama dengan Next.js server).

| Metode | Path | Dipakai oleh | Isi |
|---|---|---|---|
| `POST` | `/scrape` | Form analisis, tombol "Jalankan Scan Baru" | `{url, priority?}` → `{job_id, status}` |
| `GET` | `/scrape/{job_id}` | Halaman hasil (polling) | status, alasan gagal, ringkasan DET bila selesai |
| `GET` | `/monitor/stats` | Kartu atas Monitoring | pekerjaan aktif, situs dipindai hari ini, waktu terakhir, jumlah gagal |
| `GET` | `/monitor/jobs?status=&q=&page=` | Tabel Monitoring | daftar job + "data ditemukan" (jumlah bukti) |
| `POST` | `/discovery/run` | Admin (manual) | memicu satu putaran discovery |

`POST /analyze` yang sudah ada tetap dipakai untuk unggahan screenshot tanpa scraping.

---

## 8. Skema database (draf SQL, Supabase)

```sql
-- Kandidat URL dari semua sumber penemuan
create table if not exists public.discovered_urls (
  id              bigint generated always as identity primary key,
  url             text not null,
  url_normalized  text not null unique,
  domain          text not null,
  source          text not null check (source in
                    ('certstream','crtsh','commoncrawl','report','snowball','search')),
  source_keyword  text,                 -- kata kunci yang menemukannya
  snippet         text,                 -- dari mesin pencari / Common Crawl
  prescore        real,                 -- DET-01 (+ DET-04 snippet)
  status          text not null default 'NEW' check (status in
                    ('NEW','QUEUED','SCRAPED','IGNORED','WHITELISTED')),
  first_seen      timestamptz not null default now(),
  last_seen       timestamptz not null default now()
);
create index on public.discovered_urls (domain);
create index on public.discovered_urls (status, prescore desc);

-- Antrean scraping (dibaca halaman Monitoring)
create table if not exists public.scrape_jobs (
  id            bigint generated always as identity primary key,
  url           text not null,
  discovered_id bigint references public.discovered_urls(id),
  laporan_id    bigint,                 -- bila berasal dari form (laporan_analisis.id)
  priority      smallint not null default 5,   -- 1 = form pengguna, 5 = discovery
  status        text not null default 'PENDING' check (status in
                  ('PENDING','IN_PROGRESS','SUCCESS','FAILED','BLOCKED')),
  failure_code  text,
  attempts      smallint not null default 0,
  created_at    timestamptz not null default now(),
  started_at    timestamptz,
  finished_at   timestamptz
);
create index on public.scrape_jobs (status, priority, created_at);

-- Hasil scraping + deteksi
create table if not exists public.scrape_results (
  id               bigint generated always as identity primary key,
  job_id           bigint not null references public.scrape_jobs(id) on delete cascade,
  final_url        text,
  http_status      smallint,
  title            text,
  page_text        text,                -- dipotong maks. 200.000 karakter
  screenshot_path  text,                -- path di disk VPS atau Storage
  outbound_links   text[],
  cloaking         boolean default false,
  overall_score    real,                -- 0..1 dari pipeline
  indication       text,                -- Rendah / Sedang / Tinggi
  modules          jsonb,               -- ringkasan get_summary()['modules']
  scraped_at       timestamptz not null default now()
);

-- Situs yang dipantau + riwayat skor (bahan Early Warning)
create table if not exists public.monitored_sites (
  domain         text primary key,
  first_seen     timestamptz not null default now(),
  last_scanned   timestamptz,
  last_score     real,
  rescan_hours   smallint not null default 24,
  active         boolean not null default true
);
create table if not exists public.site_scores (
  domain      text not null references public.monitored_sites(domain) on delete cascade,
  scanned_at  timestamptz not null default now(),
  score       real not null,
  primary key (domain, scanned_at)
);

-- Catatan tiap putaran discovery (evaluasi produktivitas kata kunci)
create table if not exists public.discovery_runs (
  id           bigint generated always as identity primary key,
  source       text not null,
  keyword      text,
  query        text,
  started_at   timestamptz not null default now(),
  results      integer,
  new_urls     integer,
  error        text
);

-- RLS: hanya server (service_role) yang menulis; admin membaca lewat API/Next.js server.
alter table public.discovered_urls enable row level security;
alter table public.scrape_jobs     enable row level security;
alter table public.scrape_results  enable row level security;
alter table public.monitored_sites enable row level security;
alter table public.site_scores     enable row level security;
alter table public.discovery_runs  enable row level security;
```

Catatan:
- Belum ada policy baca untuk `anon`. Halaman admin sebaiknya membaca lewat route Next.js di
  server dengan pengecekan peran admin. Ingat: saat ini belum ada `middleware.ts`/`proxy.ts` yang
  melindungi `/admin`, dan peran admin dari form pendaftaran tidak boleh dipercaya
  (lihat `KONTEKS_PROYEK.md`).
- Supabase gratis terbatas (sekitar 500 MB database, 1 GB storage; **cek kuota terbaru**).
  `page_text` dan screenshot cepat menumpuk, jadi simpan screenshot di **disk VPS** dan hanya
  salin ke Storage untuk situs berindikasi Tinggi. Hapus teks/screenshot situs Rendah setelah 7 hari.

---

## 9. Penjadwalan dan kapasitas

| Tugas | Frekuensi | Batas |
|---|---|---|
| CertStream | terus-menerus | saring di memori, simpan hanya yang pra-skor ≥ 0.4 |
| crt.sh | tiap 6 jam, satu putaran kata kunci jangkar | jeda ≥ 15 detik antar-query |
| Common Crawl | tiap crawl baru (± bulanan) | fase 2, setelah uji ukuran |
| Scan ulang situs Tinggi | tiap 24 jam | untuk Early Warning |
| Scan ulang situs Sedang | tiap 72 jam | |
| Sinkron kata kunci | tiap 15 menit | sudah ada di `KeywordProvider` |

Perkiraan kapasitas (perlu diukur di VPS sebenarnya):
- DET-01 hanya membaca teks URL: puluhan ribu domain per hari tanpa masalah.
- Playwright ±0,5 GB RAM per browser. VPS 4 GB → 2 browser paralel (± beberapa ratus halaman/hari);
  8 GB → 4 browser.
- OCR (Tesseract) beberapa detik per screenshot; jalankan hanya untuk kandidat yang lolos pra-skor.

---

## 10. Deploy di VPS

```
docker-compose.yml
  caddy            HTTPS otomatis (Let's Encrypt), meneruskan ke detection-api
  detection-api    FastAPI (DET-06 + endpoint §7)
  scraper-worker   Playwright + pipeline (bisa >1 replika)
  discovery        klien CertStream + crt.sh
  scheduler        APScheduler / cron
  certstream       certstream-server-go (opsional, bila layanan publik mati)
  searxng          opsional
```

Variabel lingkungan (di `.env` server, **tidak** di git): `SUPABASE_URL`, `SUPABASE_KEY`
(service_role, hanya di server), `API_KEY`, `ALLOWED_ORIGINS`, `SCRAPER_CONCURRENCY`,
`DATA_DIR`. Di Next.js (Vercel): `DETECTION_API_URL`, `DETECTION_API_KEY`.

Lokasi server memengaruhi hasil:
- **VPS di Indonesia** kemungkinan ikut filter TrustPositif → banyak situs judi hanya tampil
  sebagai halaman blokir (dicatat `BLOCKED`, isinya tidak bisa dianalisis).
- **VPS di luar negeri** (mis. Singapura) tidak terkena filter itu → lebih cocok untuk scraping.

---

## 11. Keamanan dan etika

- **Isolasi:** scraper di container terpisah, tanpa akses ke kunci service_role selain yang perlu,
  tidak berbagi jaringan dengan layanan lain selain antrean/database.
- **SSRF:** sebelum membuka URL, resolve DNS dan tolak IP privat/lokal (`127.0.0.0/8`, `10.0.0.0/8`,
  `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16` termasuk `169.254.169.254`, `::1`, `fc00::/7`).
  Cek ulang setelah setiap redirect.
- **Hanya membaca:** tidak login, mendaftar, mengisi form, mengklik deposit, atau mengunduh berkas.
- **Sopan terhadap server lain:** batasi request per domain (mis. 1 per 10 detik), hormati batas
  crt.sh/Common Crawl, User-Agent jujur yang menyebut proyek penelitian.
- **Izin:** server dibayar dosen, jadi minta persetujuan tertulis bahwa server dipakai men-scrape
  situs judi untuk penelitian, dan cek Acceptable Use Policy penyedia VPS.
- **Data pribadi:** jangan simpan data akun/pengguna yang mungkin tampil di halaman judi.
- **API:** semua endpoint scraping wajib `X-API-Key`; batasi scan per pengguna di form
  (mis. 10 per jam) supaya server tidak disalahgunakan.

---

## 12. Pengujian

| Jenis | Isi |
|---|---|
| Unit | Normalisasi URL, whitelist, pra-skor, kategori kegagalan, penolakan IP privat; server HTML lokal sebagai situs uji (tanpa internet) |
| Kontrak | Pengurai JSON crt.sh dan CertStream dengan contoh respons yang disimpan |
| Integrasi | Worker men-scrape halaman uji lokal → hasil masuk `scrape_results` dengan pipeline lengkap |
| Lapangan | 10–20 query crt.sh + scrape hasilnya; ukur **berapa persen kandidat yang benar Tinggi** setelah dicek manual |

Metrik untuk laporan/paper: jumlah domain baru per sumber per hari, presisi kandidat (dicek manual
pada sampel), proporsi `FAILED`/`BLOCKED`, waktu rata-rata per scan.

---

## 13. Rencana kerja Sprint 3 (usulan)

| # | Pekerjaan | Bergantung pada | Perkiraan |
|---|---|---|---|
| 1 | SQL tabel §8 + RLS, dijalankan di Supabase | – | 0,5 hari |
| 2 | Modul scraper (dari `collect_samples.py`) + kategori gagal + blokir SSRF + tes | – | 2 hari |
| 3 | Antrean `scrape_jobs` + worker + endpoint `/scrape` | 1, 2 | 1,5 hari |
| 4 | Form analisis memakai `/scrape` bila hanya URL; halaman hasil polling status | 3 | 1 hari |
| 5 | Discovery crt.sh + pra-skor + `discovery_runs` | 1 | 1,5 hari |
| 6 | Halaman Web Scraping Monitor (Figma `71:602`) + `/monitor/*` | 3 | 2 hari |
| 7 | Deploy VPS (docker compose, Caddy, firewall) | 3 | 1 hari |
| 8 | CertStream (self-host bila perlu) | 5, 7 | 1 hari |
| 9 | Scan ulang berkala + `site_scores` untuk Early Warning | 3, 7 | 1 hari |
| 10 | Fase 2: Common Crawl columnar, cek cloaking, bola salju | 5 | uji kelayakan dulu |

Pembagian PIC belum ditentukan; selaraskan dengan backlog sprint 3.

---

## 14. Pertanyaan terbuka

Untuk dosen (VPS):
1. Penyedia dan **lokasi** server (Indonesia atau luar negeri)?
2. Spesifikasi (vCPU, RAM, disk) dan kuota bandwidth?
3. OS, akses root/SSH, boleh pasang Docker?
4. Domain/subdomain untuk API?
5. Persetujuan tertulis untuk scraping situs judi demi penelitian, dan batas anggaran.

Untuk tim:
1. Siapa PIC tiap pekerjaan di §13?
2. Apakah situs hasil discovery ditampilkan di halaman yang sama dengan laporan masyarakat
   (Hasil Klasifikasi) atau terpisah (Monitoring saja)?
3. Ambang pra-skor 0.4 sudah cukup, atau mulai lebih ketat (0.6) supaya antrean tidak penuh?

---

## Sumber

- crt.sh: tidak ada dokumentasi API resmi; perilaku di atas dari uji langsung 10/11/2026 dan
  catatan komunitas ([cert.imfht.com](https://cert.imfht.com/crt-sh-api)).
- Common Crawl Index Server: [index.commoncrawl.org](https://index.commoncrawl.org/).
- certstream-server-go: [d-Rickyy-b/certstream-server-go](https://gittrend.io/repo/d-Rickyy-b/certstream-server-go).
- Penutupan Google Custom Search JSON API: [Brave](https://brave.com/learn/google-api-shutdown/),
  [Firecrawl](https://www.firecrawl.dev/blog/google-search-json-api-alternative).
- Penghentian Bing Search API: [The Register](https://www.theregister.com/2025/05/15/bing_search_apis_retired/).
- Harga Brave Search API (belum diverifikasi ke situs resmi): [CostBench](https://costbench.com/software/ai-search-apis/brave-search-api/).
- PRD proyek: `docs/PRD_GambleWatch.md` (F11, F12, kebutuhan non-fungsional, risiko).
