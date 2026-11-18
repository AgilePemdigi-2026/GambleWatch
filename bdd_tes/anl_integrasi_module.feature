Feature: Form Analisis Tersambung ke Mesin Deteksi (ANL + DET-06)
  Sebagai masyarakat
  Saya ingin URL yang saya laporkan langsung dinilai mesin deteksi
  Agar laporan yang tersimpan berisi tingkat risiko, skor, dan bukti yang asli

  Background:
    Given penyimpanan laporan di Supabase disimulasikan
    And pengguna membuka form analisis situs

  Scenario: Hasil deteksi asli tersimpan saat pengguna menganalisis URL
    When pengguna menganalisis URL "slotgacor88.bet/daftar" melalui form
    Then laporan yang tersimpan memiliki tingkat risiko "HIGH"
    And laporan yang tersimpan memiliki bukti deteksi berindikasi "Tinggi"
    And halaman hasil analisis menampilkan risiko "HIGH"

  Scenario: Situs biasa tersimpan dengan risiko rendah
    When pengguna menganalisis URL "www.tokopedia.com" melalui form
    Then laporan yang tersimpan memiliki tingkat risiko "LOW"

  Scenario: Layanan deteksi tidak dapat dihubungi
    Given layanan deteksi sedang tidak dapat dihubungi
    When pengguna menganalisis URL "slotgacor88.bet" melalui form
    Then form menampilkan pesan "Layanan deteksi tidak dapat dihubungi"
    And tidak ada data yang ditulis ke Supabase
