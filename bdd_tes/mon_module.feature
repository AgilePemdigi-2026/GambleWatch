Feature: Monitoring Web Scraping (F11)
  Sebagai admin Komdigi
  Saya ingin memantau pekerjaan scraping dan menambah scan situs baru
  Agar saya tahu situs mana yang sudah dipindai, sedang diproses, atau gagal

  Background:
    Given data scraping berikut tersedia:
      | url                          | status      | selesai | temuan | gagal          |
      | https://slot-mega-win.xyz    | SUCCESS     | 10      | 3      |                |
      | https://casino-indo.com      | IN_PROGRESS |         | 0      |                |
      | https://antre-dulu.com       | PENDING     |         | 0      |                |
      | https://judi-bola-online.org | FAILED      | 20      | 0      | BOT_PROTECTION |
      | https://berita-biasa.com     | SUCCESS     | 30      | 0      |                |

  Scenario: Admin melihat ringkasan dan daftar pekerjaan scraping
    Given admin sudah masuk
    When admin membuka halaman monitoring scraping
    Then kartu "Pekerjaan Aktif" menampilkan "1"
    And kartu "Situs Dipindai Hari Ini" menampilkan "3"
    And kartu "Error / Gagal" menampilkan "1"
    And halaman menampilkan teks "Terbanyak: Proteksi Cloudflare / anti-bot"
    And baris "https://slot-mega-win.xyz" berstatus "SUCCESS" dengan data "Ya (3 Bukti)"
    And baris "https://berita-biasa.com" berstatus "SUCCESS" dengan data "Tidak"
    And baris "https://casino-indo.com" berstatus "IN PROGRESS" dengan data "—"
    And halaman menampilkan teks "dari 5 Pekerjaan"

  Scenario: Admin menyaring pekerjaan yang gagal
    Given admin sudah masuk
    When admin membuka halaman monitoring scraping
    And admin memilih filter status "Failed"
    Then tabel hanya menampilkan "https://judi-bola-online.org"

  Scenario: Admin menambah scan baru ke antrean
    Given admin sudah masuk
    When admin membuka halaman monitoring scraping
    And admin menjalankan scan baru untuk "https://situs-baru.com"
    Then job scan "https://situs-baru.com" ditambahkan dengan sumber "manual"

  Scenario: Link scan yang tidak lengkap ditolak
    Given admin sudah masuk
    When admin membuka halaman monitoring scraping
    And admin menjalankan scan baru untuk "situs-baru.com"
    Then halaman menampilkan teks "Masukkan link lengkap yang diawali http:// atau https://"
    And tidak ada data yang ditulis ke Supabase

  Scenario: Pengguna bukan admin tidak bisa menjalankan scan
    When admin membuka halaman monitoring scraping
    And pengguna menekan tombol "Jalankan Scan Baru"
    Then halaman menampilkan teks "Hanya admin yang dapat menjalankan scan"
    And tidak ada data yang ditulis ke Supabase

  Scenario: Tabel scraping belum dibuat di Supabase
    Given tabel scraping belum dibuat
    When admin membuka halaman monitoring scraping
    Then halaman menampilkan teks "Tabel scraping belum dibuat di Supabase"
