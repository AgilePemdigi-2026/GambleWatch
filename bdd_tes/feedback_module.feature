Feature: Mengirim Feedback
  In order to memberikan saran, laporan bug, atau laporan data kepada pengelola sistem
  As a masyarakat
  I want to mengirim feedback

  Scenario: Mengirim feedback secara anonim
    Given Masyarakat membuka halaman feedback "/feedback"
    When Masyarakat mencentang checkbox "Kirim sebagai Anonim"
    And Masyarakat memilih kategori feedback "Laporan Bug"
    And Masyarakat mengisi "Pesan Masukan" dengan "Terdapat masalah pada sistem."
    And Masyarakat mengklik tombol "KIRIM FEEDBACK"
    Then Notifikasi berhasil mengirim feedback harus muncul di layar

  Scenario: Mengirim feedback dengan identitas
    Given Masyarakat membuka halaman feedback "/feedback"
    When Masyarakat mengisi "Nama Lengkap (Opsional)" dengan "Rahmadevi"
    And Masyarakat memilih kategori feedback "Saran Fitur"
    And Masyarakat mengisi "Pesan Masukan" dengan "Tambahkan fitur pencarian riwayat analisis."
    And Masyarakat mengklik tombol "KIRIM FEEDBACK"
    Then Notifikasi berhasil mengirim feedback harus muncul di layar

  Scenario: Mengirim laporan bug
    Given Masyarakat membuka halaman feedback "/feedback"
    When Masyarakat memilih kategori feedback "Laporan Bug"
    And Masyarakat mengisi "Pesan Masukan" dengan "Terdapat bug pada halaman analisis."
    And Masyarakat mengklik tombol "KIRIM FEEDBACK"
    Then Notifikasi berhasil mengirim feedback harus muncul di layar

  Scenario: Mengirim saran fitur
    Given Masyarakat membuka halaman feedback "/feedback"
    When Masyarakat memilih kategori feedback "Saran Fitur"
    And Masyarakat mengisi "Pesan Masukan" dengan "Tambahkan fitur notifikasi."
    And Masyarakat mengklik tombol "KIRIM FEEDBACK"
    Then Notifikasi berhasil mengirim feedback harus muncul di layar

  Scenario: Mengirim laporan data
    Given Masyarakat membuka halaman feedback "/feedback"
    When Masyarakat memilih kategori feedback "Laporan Data"
    And Masyarakat mengisi "Pesan Masukan" dengan "Data klasifikasi situs perlu diperbarui."
    And Masyarakat mengklik tombol "KIRIM FEEDBACK"
    Then Notifikasi berhasil mengirim feedback harus muncul di layar

  Scenario: Gagal mengirim feedback karena pesan masukan kosong
    Given Masyarakat membuka halaman feedback "/feedback"
    When Masyarakat membiarkan "Pesan Masukan" kosong
    And Masyarakat mengklik tombol "KIRIM FEEDBACK"
    Then Validasi pesan masukan wajib diisi harus mencegah pengiriman