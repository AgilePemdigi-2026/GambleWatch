Feature: Modul Form Analisis Situs & Hasil Indikasi (ANL)
  Sebagai masyarakat/pengguna umum
  Saya ingin mengunggah URL situs terindikasi judi online dan/atau bukti gambar
  Agar saya mendapatkan hasil indikasi awal dan dapat melaporkannya ke admin

  Pemindaian dengan URL sudah diuji di anl_integrasi_module.feature; modul ini menguji
  pemindaian dengan gambar saja dan tindakan di halaman hasil indikasi.

  Background:
    Given penyimpanan laporan di Supabase disimulasikan

  Scenario: Pengguna melakukan scan dengan mengunggah bukti gambar saja
    Given pengguna membuka form analisis situs
    When pengguna memilih gambar bukti bertuliskan "SLOT GACOR MAXWIN DEPOSIT PULSA"
    And pengguna menekan tombol SCAN
    Then pengguna diarahkan ke halaman hasil indikasi
    And laporan yang tersimpan berisi teks OCR "SLOT"
    And browser tidak menulis laporan langsung ke Supabase

  Scenario: Menampilkan halaman hasil indikasi berdasarkan ID laporan yang valid
    Given ada laporan analisis dengan ID 12 berstatus "DRAFT"
    When pengguna membuka halaman hasil indikasi laporan 12
    Then halaman hasil analisis menampilkan "ID-12"
    And halaman hasil analisis menampilkan "Status DB: DRAFT"
    And halaman hasil analisis menampilkan "HIGH"

  Scenario: Pengguna mengirimkan laporan ke Admin (Save to History & Alert Admin)
    Given ada laporan analisis dengan ID 12 berstatus "DRAFT"
    And pengguna membuka halaman hasil indikasi laporan 12
    When pengguna menekan tombol "SAVE TO HISTORY & ALERT ADMIN"
    Then status laporan 12 diubah menjadi "SUBMITTED" di tabel "laporan_analisis"
    And halaman hasil analisis menampilkan "Berhasil Disimpan!"
    And halaman hasil analisis menampilkan "Status DB: SUBMITTED"
    When pengguna menekan tombol "OK"
    Then pengguna diarahkan kembali ke halaman form "/form-gamblin-analysis"

  Scenario: Pengguna membatalkan laporan (Discard Analysis)
    Given ada laporan analisis dengan ID 12 berstatus "DRAFT"
    And pengguna membuka halaman hasil indikasi laporan 12
    When pengguna menekan tombol "DISCARD ANALYSIS"
    And pengguna menekan tombol "Ya, Hapus"
    Then laporan 12 dihapus dari tabel "laporan_analisis"
    And halaman hasil analisis menampilkan "Analisis Dibuang"
    When pengguna menekan tombol "OK"
    Then pengguna diarahkan kembali ke halaman form "/form-gamblin-analysis"

  Scenario: Pengguna batal membuang laporan
    Given ada laporan analisis dengan ID 12 berstatus "DRAFT"
    And pengguna membuka halaman hasil indikasi laporan 12
    When pengguna menekan tombol "DISCARD ANALYSIS"
    And pengguna menekan tombol "Batal"
    Then tidak ada data yang ditulis ke Supabase
    And halaman hasil analisis menampilkan "ID-12"
