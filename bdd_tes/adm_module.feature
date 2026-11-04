Feature: Admin Dashboard Module (ADM)

  Scenario: Menampilkan statistik laporan real-time dari Supabase
    Given Admin membuka halaman dashboard ("/admin")
    When Sistem berhasil memuat data statistik dari database Supabase
    Then Kartu "Total laporan" harus menampilkan jumlah laporan riil
    And Kartu "Situs berisiko tinggi" harus menampilkan jumlah situs risiko tinggi
    And Kartu "Menunggu tinjauan" harus menampilkan jumlah laporan status pending
    And Grafik "Tren deteksi" harus menampilkan data deteksi bulanan

  Scenario: Navigasi cepat dari dashboard admin
    Given Admin berada di halaman dashboard ("/admin")
    When Admin mengklik menu "Hasil klasifikasi" pada section Akses cepat
    Then Halaman harus berpindah ke rute ("/admin/classification")