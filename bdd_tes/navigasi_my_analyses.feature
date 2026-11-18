Feature: Navigasi Antarmuka Publik dan Riwayat My Analyses
  Sebagai pengguna masyarakat
  Saya ingin menekan tombol "MY ANALYSES" pada header
  Agar saya dapat melihat status riwayat analisis saya

  Scenario: Pengguna membuat laporan baru lalu mengeceknya di halaman My Analyses
    Given Pengguna membuka halaman analisis "/form-gamblin-analysis"
    When Pengguna mengisi input URL "http://slot-gacor-test.xyz"
    And Pengguna mengklik tombol SCAN
    Then Pengguna diarahkan ke halaman hasil analisis
    When Pengguna mengklik tombol "MY ANALYSES" pada header
    Then Pengguna harus diarahkan ke halaman "/my-analyses"
    And Judul halaman "My Analyses" harus tampil di layar

  Scenario: Pengguna membuka My Analyses saat belum ada data
    Given Pengguna berada di halaman "/my-analyses"
    Then Teks indikator "Belum ada riwayat analisis" atau daftar analisis harus tampil di layar