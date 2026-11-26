# Deploy: Pemindaian Link (form analisis)

Fitur: masyarakat memasukkan link lengkap di form → route Next.js `/api/analyze` → API deteksi
`POST /scan` membuka link dengan Chromium headless → DET-01..04 menilai URL, teks halaman, iframe,
screenshot (layar pertama untuk DET-02, sampai 3 layar untuk OCR) → bila tampak bersih, dicoba
lagi sebagai pengunjung dari Google (cloaking) dan HP → **server** menyimpan laporan + bukti.

## 1. Environment

| Variabel | Di mana | Isi |
|---|---|---|
| `DETECTION_API_URL` | Next.js | `http://127.0.0.1:8001` (port 8000 dipakai Supabase self-hosted) |
| `DETECTION_API_KEY` | Next.js **dan** API deteksi | string acak panjang yang sama di keduanya |
| `SUPABASE_SERVICE_ROLE_KEY` | Next.js (server saja) | kunci service_role; **tanpa** awalan `NEXT_PUBLIC_`, jangan di-commit |
| `ALLOWED_ORIGINS` | API deteksi | origin web, mis. `https://gamblewatch.example` |

## 2. API deteksi + Chromium

### Dengan Docker (disarankan, dipakai di Coolify)

`Dockerfile.api` sudah berisi Python, Chromium headless, dan Tesseract (+ bahasa Indonesia),
memakai `requirements-api.txt` (tanpa torch/transformers dan alat dev), dan berjalan sebagai
user non-root dengan healthcheck `/health`. Ukuran image ±2 GB; memori ±220 MB setelah satu
pemindaian, naik saat halaman berat dibuka.

```bash
docker build -f Dockerfile.api -t gamblewatch-api .
docker run -p 8001:8001 -e DETECTION_API_KEY=... -e ALLOWED_ORIGINS=https://... gamblewatch-api
```

Di Coolify:

1. **+ New → Public Git Repository**, repo ini, branch `main`, build pack **Dockerfile**,
   Dockerfile location `/Dockerfile.api`, port `8001`.
2. **Hapus domain** yang dibuat otomatis: API hanya dipanggil Next.js lewat jaringan internal.
3. Environment API: `DETECTION_API_KEY`, `ALLOWED_ORIGINS`, dan opsional `SUPABASE_URL` +
   `SUPABASE_KEY` (kunci **anon**, untuk membaca tabel `keywords`; tanpa ini dipakai
   `data/keywords.json`). Jangan beri container ini `SUPABASE_SERVICE_ROLE_KEY`.
4. Deploy, tunggu status healthy, salin **Internal hostname**.
5. Environment website (Runtime): `DETECTION_API_URL=http://<internal-hostname>:8001`,
   `DETECTION_API_KEY` yang sama, dan `SUPABASE_SERVICE_ROLE_KEY` (lihat bagian 6). Redeploy.
6. Uji: form analisis dengan `https://example.com` harus menghasilkan risiko rendah.

Catatan: di Coolify container berada di jaringan Docker yang sama dengan Supabase, jadi blokir
alamat privat di level aplikasi (`safety.py`) adalah satu-satunya lapisan, kecuali aturan
iptables di bagian 3 dipasang oleh pengelola server.

### Tanpa Docker

```bash
pip install -r requirements.txt
python -m playwright install --with-deps chromium
python -m uvicorn detection_engine.api.main:app --host 127.0.0.1 --port 8001
```

API cukup mendengarkan di `127.0.0.1`; hanya Next.js (di server yang sama) yang memanggilnya.

## 3. Isolasi (penting: server ini membuka link dari publik)

Pemeriksaan alamat di `detection_engine/scraper/safety.py` menolak link ke jaringan internal
(127.0.0.1, 10.x, 192.168.x, 169.254.169.254, dst.), termasuk lewat redirect dan sumber daya
halaman. Keterbatasannya: pemeriksaan dan koneksi Chromium me-resolve DNS secara terpisah, jadi
secara teori domain bisa berganti alamat di antara keduanya (*DNS rebinding*). Karena itu, di
server lapisan kedua dipasang di level jaringan:

1. Jalankan API deteksi di **container terpisah** (Docker) yang hanya boleh keluar ke internet:
   - jangan pakai `--network host`;
   - blokir keluar ke rentang privat dan metadata, contoh dengan iptables di host:
     ```bash
     iptables -I DOCKER-USER -s <subnet-container> -d 10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,169.254.0.0/16,100.64.0.0/10 -j DROP
     ```
2. Container tidak memegang `SUPABASE_SERVICE_ROLE_KEY` (kunci itu hanya untuk Next.js).
3. Jalankan sebagai user non-root; jangan mount folder proyek dengan akses tulis selain `data/`.

## 4. Lokasi server

Server di Indonesia ikut filter TrustPositif: banyak situs judi hanya tampil sebagai halaman blokir
dan dinilai dari URL saja (status `BLOCKED`). Untuk menilai isinya, server pemindai perlu berada
di luar Indonesia atau keluar lewat proxy luar negeri. Ini keputusan infrastruktur bersama dosen.

## 5. Index referensi DET-02

`data/reference_index.npz` ikut di-commit (±1 KB, hanya hash pHash + nama file, dibaca dengan
`allow_pickle=False`). Untuk membangun ulang dari folder screenshot judi:

```bash
python scripts/build_reference_index.py --image-dir <folder screenshot judi>
```

Skrip otomatis membuang halaman anti-bot/Cloudflare, 404, gambar polos, dan duplikat. API membaca
ulang index bila file berubah, tanpa restart.

## 6. Supabase

Urutan: isi `SUPABASE_SERVICE_ROLE_KEY` → uji form sekali → jalankan
`supabase-setup/migration_05_laporan_simpan_server.sql` (browser tidak bisa lagi menulis laporan).

## 7. Mengukur akurasi

```bash
python scripts/evaluate_scan.py --per-label 20
```

Membaca `data/samples/urls.csv`, menulis hasil per URL ke `data/samples/hasil_scan.csv`, dan
mencetak recall, salah tandai, serta rincian status pemindaian. Tidak menulis ke Supabase.
