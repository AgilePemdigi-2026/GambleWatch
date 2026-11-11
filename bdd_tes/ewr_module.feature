Feature: Modul Analisis Peringatan Dini & Detail Sinyal Anomali (EWR)
  Sebagai Administrator / Analis KOMDIGI
  Saya ingin memantau indikator sinyal peringatan dini, grafik tren lonjakan anomali, serta rincian detail teknis tiap domain
  Agar saya dapat melakukan evaluasi risiko dan mengeksekusi tindakan pemblokiran situs perjudian ilegal secara cepat dan akurat

  Background:
    Given Administrator telah masuk ke sistem dan berada di halaman "Analisis Peringatan Dini" ("/admin/early-warning")

  # --- SKENARIO HALAMAN UTAMA EARLY WARNING (LISTING & TREN) ---

  Scenario: Menampilkan 4 Ringkasan Kartu Sinyal Anomali Domain Utama
    Then Halaman EWR menampilkan 4 kartu sinyal anomali domain terindikasi
    And Setiap kartu menampilkan nama domain, persentase peningkatan risiko, dan deskripsi indikasi
    And Kartu dengan risiko tinggi menggunakan badge warna merah "HIGH RISK"

  Scenario: Pencarian Real-Time Domain dan Pola Indikasi
    When Administrator memasukkan kata kunci "slotgacor" pada kolom pencarian
    Then Sistem menyaring kartu dan tabel pola terindikasi
    And Tampilan hanya menyajikan domain yang mengandung kata "slotgacor"

  Scenario: Mengubah Rentang Waktu Grafik Tren Indikasi ke "Bulan Ini"
    When Administrator mengubah filter rentang waktu grafik menjadi "Bulan Ini"
    Then Grafik SVG tren indikasi memperbarui titik koordinat data untuk bulan berjalan
    And Keterangan rentang waktu grafik berubah menjadi "Bulan Ini"

  Scenario: Mengubah Rentang Waktu Grafik Tren Indikasi ke "6 Bulan Terakhir"
    When Administrator mengubah filter rentang waktu grafik menjadi "6 Bulan Terakhir"
    Then Grafik SVG tren indikasi menampilkan pergerakan data dari bulan "Jun" hingga "Nov"
    And Keterangan rentang waktu grafik berubah menjadi "Juni – November 2026"

  Scenario: Filter Status Pola Terindikasi pada Tabel Utama
    When Administrator menekan tombol filter "Tampilkan: Aktif"
    Then Tabel pola terindikasi hanya menampilkan data dengan tingkat keparahan "Kritis" dan "Peringatan"
    And Baris data dengan tingkat keparahan "Info" tidak ditampilkan

  # --- SKENARIO HALAMAN DETAIL SINYAL EARLY WARNING ---

  Scenario: Navigasi dan Verifikasi Halaman Rincian Detail Sinyal Anomali
    Given Ada data sinyal di database Supabase dengan ID "127" untuk domain "https://slotgacor-angker77.pages.dev"
    When Administrator menekan tombol "Lihat Detail" pada baris sinyal ID "127"
    Then Pengguna diarahkan ke halaman rincian detail sinyal ("/admin/early-warning/127")
    And Halaman detail menampilkan nama domain "https://slotgacor-angker77.pages.dev"
    And Halaman detail menampilkan ID Sinyal "#127" dengan badge risiko "HIGH RISK"
    And Section Rincian Sinyal menampilkan Kategori Pola Indikasi "Keywords Found: slot, gacor, angker77"
    And Section Rincian Sinyal menampilkan Hasil Deteksi "High Risk (95%): Gambling keyword in domain: 'slot, gacor, angker77'"
    And Section Rincian Sinyal menampilkan Waktu Peringatan Terpicu "11/11/2026, 22:13:51"
    And Card Skor Sinyal Anomali Risk menampilkan nilai "95/100"
    And Section Indikator Teknis menampilkan Evaluasi Risiko "HIGH RISK" dan Kategori Sistem "Keywords Found: slot, gacor, angker77"

  Scenario: Eksekusi Aksi Inspeksi Situs External Link
    Given Administrator berada di halaman rincian detail sinyal ID "127" ("/admin/early-warning/127")
    When Administrator menekan tombol "Inspeksi Situs"
    Then Sistem membuka URL situs "https://slotgacor-angker77.pages.dev" pada tab baru browser

  Scenario: Navigasi Lanjutan ke Modul Proses Pemblokiran
    Given Administrator berada di halaman rincian detail sinyal ID "127" ("/admin/early-warning/127")
    When Administrator menekan tombol "Proses Pemblokiran ↗"
    Then Pengguna diarahkan secara otomatis ke halaman status pemblokiran ("/admin/block-status/127")