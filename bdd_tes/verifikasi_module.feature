Feature: Modul Verifikasi Laporan Masyarakat
  Sebagai Admin Verifikator Komdigi
  Saya ingin meninjau data dinamis laporan dan memperbarui status regulasinya
  Agar status pemblokiran tersimpan ke Supabase

  Scenario: Memuat detail laporan dinamis dari Supabase
    Given Admin membuka halaman verifikasi laporan "/admin/verifikasi/126"
    Then Judul halaman "Tindak Lanjut & Status Pemblokiran" harus muncul di layar
    And Kartu informasi situs, skor probabilitas, pelapor, dan tingkat risiko harus ditampilkan

  Scenario: Admin memperbarui status regulasi dan catatan verifikator
    Given Admin sedang berada di halaman verifikasi "/admin/verifikasi/126"
    When Admin memilih status regulasi "Blocked"
    And Admin mengisikan nomor surat "KOMDIGI/DIT-APT/VI/2026/8912"
    And Admin mengisikan catatan petugas "Situs terbukti memuat tautan judi online"
    And Admin mengklik tombol "Update Status"
    Then Toast notifikasi pembaruan status harus muncul
    And Admin diubah arahnya kembali ke halaman "/admin/hasil-klasifikasi"

  Scenario: Membuka modal riwayat audit laporan
    Given Admin sedang berada di halaman verifikasi "/admin/verifikasi/126"
    When Admin mengklik tombol "Riwayat Audit"
    Then Modal riwayat audit laporan harus terbuka di layar