Feature: Modul Analisis Peringatan Dini & Detail Sinyal Anomali (EWR)
  Sebagai Administrator / Analis KOMDIGI
  Saya ingin memantau indikator sinyal peringatan dini, grafik tren lonjakan anomali, serta rincian detail teknis tiap domain
  Agar saya dapat melakukan evaluasi risiko dan mengeksekusi tindakan pemblokiran situs perjudian ilegal secara cepat dan akurat

  Background:
    Given data sinyal peringatan dini disimulasikan:
      | id  | url                                  | risiko | skor | status    | waktu      | temuan                                 |
      | 127 | https://slotgacor-angker77.pages.dev | HIGH   | 95   | SUBMITTED | 1 jam lalu | keyword_analysis: slot, gacor, angker77 |
      | 128 | https://togel-hoki.example           | MEDIUM | 55   | SUBMITTED | 1 jam lalu |                                        |
      | 129 | https://toko-buku.example            | LOW    | 5    | SUBMITTED | 1 jam lalu |                                        |

  # --- HALAMAN UTAMA EARLY WARNING (LISTING & TREN) ---

  Scenario: Menampilkan kartu sinyal anomali domain terindikasi
    When admin membuka halaman "/admin/early-warning"
    Then halaman EWR menampilkan 3 kartu sinyal anomali
    And kartu domain "https://slotgacor-angker77.pages.dev" menampilkan peningkatan risiko "+42%"
    And kartu domain "https://togel-hoki.example" menampilkan peningkatan risiko "+18%"

  Scenario: Pencarian real-time domain dan pola indikasi
    When admin membuka halaman "/admin/early-warning"
    And administrator memasukkan kata kunci "slotgacor" pada kolom pencarian
    Then halaman EWR menampilkan 1 kartu sinyal anomali
    And tabel pola terindikasi hanya menampilkan domain yang mengandung "slotgacor"

  Scenario: Mengubah rentang waktu grafik tren indikasi ke "Bulan Ini"
    When admin membuka halaman "/admin/early-warning"
    And administrator mengubah filter rentang waktu grafik menjadi "Bulan Ini"
    Then keterangan rentang waktu grafik berubah menjadi "Bulan Ini"
    And grafik tren indikasi hanya menampilkan bulan berjalan dengan nilai 3

  Scenario: Mengubah rentang waktu grafik tren indikasi ke "6 Bulan Terakhir"
    When admin membuka halaman "/admin/early-warning"
    And administrator mengubah filter rentang waktu grafik menjadi "Bulan Ini"
    And administrator mengubah filter rentang waktu grafik menjadi "6 Bulan Terakhir"
    Then grafik tren indikasi menampilkan 6 bulan terakhir yang diakhiri bulan berjalan
    And keterangan rentang waktu grafik menampilkan periode 6 bulan terakhir

  Scenario: Filter status pola terindikasi pada tabel utama
    When admin membuka halaman "/admin/early-warning"
    Then tabel pola terindikasi menampilkan tingkat keparahan "Kritis" dan "Peringatan"
    And tabel pola terindikasi tidak menampilkan tingkat keparahan "Info"
    When administrator menekan tombol filter "Semua Pola"
    Then tabel pola terindikasi menampilkan tingkat keparahan "Info"

  # --- HALAMAN DETAIL SINYAL EARLY WARNING ---

  Scenario: Navigasi dan verifikasi halaman rincian detail sinyal anomali
    When admin membuka halaman "/admin/early-warning"
    And administrator menekan tombol "Lihat Detail" pada baris domain "https://slotgacor-angker77.pages.dev"
    Then halaman berpindah ke rute "/admin/early-warning/127"
    And halaman menampilkan teks "ID Sinyal: #127"
    And halaman menampilkan teks "https://slotgacor-angker77.pages.dev"
    And halaman menampilkan teks "HIGH"
    And halaman menampilkan teks "Rincian Sinyal Anomali Early Warning"
    And skor sinyal anomali menampilkan "95"

  Scenario: Tombol Inspeksi Situs membuka situs di tab baru
    When admin membuka halaman "/admin/early-warning/127"
    Then tombol "Inspeksi Situs" mengarah ke "https://slotgacor-angker77.pages.dev" di tab baru

  Scenario: Navigasi lanjutan ke modul proses pemblokiran
    When admin membuka halaman "/admin/early-warning/127"
    And administrator menekan tombol "Proses Pemblokiran"
    Then halaman berpindah ke rute "/admin/verifikasi/127"
