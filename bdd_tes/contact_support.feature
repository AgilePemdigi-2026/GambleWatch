Feature: Halaman Contact Support
  Sebagai pengguna platform GambleWatch
  Saya ingin dapat mengakses halaman Contact Support
  Agar saya mengetahui kanal pengaduan resmi dan kontak tim pengelola

  Scenario: Pengguna mengakses halaman Contact Support melalui footer
    Given Pengguna berada di halaman utama GambleWatch untuk melihat kontak bantuan
    When Pengguna mengklik tautan Contact Support pada footer
    Then Pengguna diarahkan ke halaman Contact Support "/contact"
    And Halaman Contact Support menampilkan judul "PERLU INFORMASI LEBIH?"
    And Halaman Contact Support menampilkan instansi "Kementerian Komunikasi dan Digital Republik Indonesia (KOMDIGI)"
    And Halaman Contact Support menampilkan email "support@gamblewatch.komdigi.go.id"
    And Halaman Contact Support menampilkan nomor layanan "0811-9224-545" dan "0811-1001-5080"
    And Halaman Contact Support menampilkan call center "159"