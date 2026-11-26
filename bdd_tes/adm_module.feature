Feature: Admin Dashboard Module (ADM)
  Sebagai Admin Komdigi
  Saya ingin melihat ringkasan laporan dan tren deteksi di dashboard
  Agar saya tahu laporan mana yang perlu segera ditindaklanjuti

  Background:
    Given data laporan untuk dashboard admin disimulasikan:
      | id  | url                            | risiko | skor | status                        | waktu      |
      | 201 | https://slot-gacor-777.example | HIGH   | 92   | Menunggu Verifikasi (Pending) | 1 jam lalu |
      | 202 | https://togel-hoki.example     | HIGH   | 88   | Blocked                       | 1 jam lalu |
      | 203 | https://casino-maxwin.example  | MEDIUM | 55   | SUBMITTED                     | 1 jam lalu |
      | 204 | https://toko-buku.example      | LOW    | 5    | DRAFT                         | 1 jam lalu |

  Scenario: Menampilkan statistik laporan dari Supabase
    When admin membuka halaman "/admin"
    Then kartu "Total laporan" menampilkan angka "4"
    And kartu "Situs berisiko tinggi" menampilkan angka "2"
    And kartu "Menunggu tinjauan" menampilkan angka "2"
    And kartu "Situs diblokir" menampilkan angka "1"
    And grafik "Tren deteksi" menampilkan 3 situs terindikasi pada bulan ini
    And halaman menampilkan teks "Terdeteksi 2 laporan berisiko tinggi dalam 24 jam terakhir"

  Scenario Outline: Navigasi cepat dari dashboard admin
    When admin membuka halaman "/admin"
    And admin mengklik menu "<menu>" pada section Akses cepat
    Then halaman berpindah ke rute "<rute>"

    Examples:
      | menu              | rute                     |
      | Hasil klasifikasi | /admin/hasil-klasifikasi |
      | Peringatan dini   | /admin/early-warning     |
      | Database kata kunci | /admin/keywords        |
