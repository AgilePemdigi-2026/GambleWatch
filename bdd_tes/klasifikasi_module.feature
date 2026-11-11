Feature: Modul Hasil Klasifikasi Publik
  Sebagai Admin Komdigi
  Saya ingin melihat tabel daftar hasil klasifikasi laporan masyarakat
  Agar saya dapat memilih laporan yang perlu ditindaklanjuti

  Scenario: Admin melihat daftar tabel laporan hasil klasifikasi
    Given Admin membuka halaman hasil klasifikasi "/admin/hasil-klasifikasi"
    Then Judul "Hasil Klasifikasi Publik" harus terlihat di layar
    And Tabel daftar laporan harus menampilkan situs URL, pelapor, dan tombol "Lihat Detail"

  Scenario: Admin menavigasi ke halaman detail verifikasi
    Given Admin berada di halaman "/admin/hasil-klasifikasi"
    When Admin mengklik tombol "Lihat Detail" pada baris laporan pertama
    Then Sistem mengarahkan URL ke rute verifikasi "/admin/verifikasi/"