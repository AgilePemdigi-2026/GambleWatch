Feature: Modul Form Analisis Situs & Hasil Indikasi (ANL)
  Sebagai masyarakat/pengguna umum
  Saya ingin mengunggah URL situs terindikasi judi online dan/atau bukti gambar
  Agar saya mendapatkan hasil indikasi awal dan dapat melaporkannya ke admin

  Background:
    Given Pengguna berada di halaman Form Analisis Situs ("/form-gambling-analysis")

  Scenario: Pengguna mencoba melakukan scan tanpa mengisi URL maupun Gambar
    When Pengguna menekan tombol "SCAN" tanpa memasukkan URL dan tanpa memilih file
    Then Sistem menampilkan pesan kesalahan "Masukkan URL atau unggah tangkapan layar terlebih dahulu."
    And Form tidak mengirimkan data ke database

  Scenario: Pengguna melakukan scan dengan memasukkan URL situs saja
    When Pengguna mengisi input URL dengan "http://slot-gacor-888.xyz"
    And Pengguna menekan tombol "SCAN"
    Then Sistem mengubah status tombol menjadi "MEMINDAI..."
    And Sistem menyimpan record baru ke tabel "laporan_analisis" dengan status "DRAFT"
    And Pengguna diarahkan ke halaman hasil indikasi ("/form-gambling-analysis/result?id={id}")

  Scenario: Pengguna melakukan scan dengan mengunggah bukti gambar saja
    When Pengguna memilih file gambar "bukti_situs.png" (ukuran < 5MB)
    And Pengguna menekan tombol "SCAN"
    Then Sistem mengunggah file gambar ke Supabase Storage bucket "bukti-analisis"
    And Sistem menyimpan URL public gambar ke kolom "bukti_screenshot" di tabel "laporan_analisis"
    And Pengguna diarahkan ke halaman hasil indikasi ("/form-gambling-analysis/result?id={id}")

  Scenario: Menampilkan halaman hasil indikasi berdasarkan ID laporan yang valid
    Given Ada data laporan di database dengan ID "12" dan status "DRAFT"
    When Pengguna membuka halaman hasil indikasi "/form-gambling-analysis/result?id=12"
    Then Sistem mengambil data laporan ID "12" dari Supabase
    And Halaman menampilkan ID Laporan "ID-12"
    And Halaman menampilkan status analisis "DRAFT"

  Scenario: Pengguna mengirimkan laporan ke Admin (Save to History & Alert Admin)
    Given Pengguna berada di halaman hasil indikasi untuk laporan ID "12" berstatus "DRAFT"
    When Pengguna menekan tombol "SAVE TO HISTORY & ALERT ADMIN"
    Then Sistem meng-update kolom status laporan ID "12" menjadi "SUBMITTED" di tabel "laporan_analisis"
    And Sistem menampilkan notifikasi sukses "Status berhasil diubah jadi SUBMITTED!"
    And Tampilan UI memperbarui status laporan menjadi "SUBMITTED"

  Scenario: Pengguna membatalkan/mengahapus laporan (Discard Analysis)
    Given Pengguna berada di halaman hasil indikasi untuk laporan ID "12"
    When Pengguna menekan tombol "DISCARD ANALYSIS"
    Then Sistem menghapus record laporan ID "12" dari tabel "laporan_analisis"
    And Pengguna diarahkan kembali ke halaman utama form ("/form-gambling-analysis")