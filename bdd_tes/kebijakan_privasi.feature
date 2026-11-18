Feature: Halaman Kebijakan Privasi
  Sebagai pengguna platform GambleWatch
  Saya ingin dapat mengakses dan membaca halaman Kebijakan Privasi
  Agar saya mengetahui bagaimana data laporan dan informasi pribadi dikelola

  Scenario: Pengguna mengakses halaman Kebijakan Privasi melalui footer
    Given Pengguna berada di halaman utama GambleWatch untuk melihat kebijakan privasi
    When Pengguna mengklik tautan Privacy Policy pada footer
    Then Pengguna diarahkan ke halaman Kebijakan Privasi "/privacy"
    And Halaman Kebijakan Privasi menampilkan judul "KEBIJAKAN PRIVASI"
    And Halaman Kebijakan Privasi menampilkan identitas "GAMBLEWATCH"
    And Halaman Kebijakan Privasi menampilkan subbagian "PENGUMPULAN DAN PENGGUNAAN INFORMASI"
    And Halaman Kebijakan Privasi menampilkan subbagian "KEAMANAN DATA"
    And Halaman Kebijakan Privasi menampilkan subbagian "PERUBAHAN KEBIJAKAN"