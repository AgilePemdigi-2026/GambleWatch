Feature: Bukti Deteksi di Halaman Tindak Lanjut & Status Pemblokiran (TLJ)
  Sebagai admin Komdigi
  Saya ingin melihat skor, risiko, dan bukti asli dari mesin deteksi
  Agar keputusan pemblokiran didasarkan pada data, bukan nilai contoh

  Scenario: Laporan dengan hasil mesin deteksi
    Given laporan 900101 berisiko tinggi dengan bukti deteksi lengkap
    When admin membuka halaman "/admin/verifikasi/900101"
    Then halaman menampilkan teks "RISIKO TINGGI (HIGH)"
    And halaman menampilkan teks "96 / 100"
    And halaman menampilkan teks "DET-01 Pola URL · DET-04 Kata kunci"
    And potongan teks bukti menyorot kata "slot gacor"
    And halaman menampilkan teks "1 Frasa Terdeteksi"
    And halaman tidak menampilkan teks "104.21.49.182"

  Scenario: Laporan lama yang belum dianalisis mesin deteksi
    Given laporan 900102 tanpa bukti deteksi
    When admin membuka halaman "/admin/verifikasi/900102"
    Then halaman menampilkan teks "Belum dianalisis mesin deteksi"
    And halaman menampilkan teks "0 Frasa Terdeteksi"
    And halaman tidak menampilkan teks "87 / 100"
