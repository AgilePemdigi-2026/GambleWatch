Feature: Form Analisis Situs Memeriksa Isi Link (ANL + DET-06)
  Sebagai masyarakat
  Saya ingin link yang saya laporkan dibuka dan isinya diperiksa mesin deteksi
  Agar laporan tersimpan dengan tingkat risiko dan bukti yang berasal dari isi situs, bukan hanya alamatnya
  Dan hasil itu disimpan oleh server sehingga tidak bisa dipalsukan dari browser

  Background:
    Given penyimpanan laporan di Supabase disimulasikan
    And pengguna membuka form analisis situs

  Scenario: Isi halaman yang dibuka ikut dinilai dan disimpan sebagai bukti
    Given mesin deteksi membuka link dan menemukan promosi judi di isi halamannya
    When pengguna memasukkan URL "https://situs-netral.com" pada form
    And pengguna menekan tombol SCAN
    Then halaman hasil analisis menampilkan "HIGH"
    And halaman hasil analisis menampilkan "Halaman berhasil dibuka dan isinya dianalisis."
    And halaman hasil analisis menampilkan "BUKTI DARI ISI HALAMAN"
    And halaman hasil analisis menampilkan "Beranda Promo"
    And browser tidak menulis laporan langsung ke Supabase

  Scenario Outline: Link yang tidak bisa dibuka tetap dinilai dari alamatnya
    When pengguna memasukkan URL "<url>" pada form
    And pengguna menekan tombol SCAN
    Then laporan yang tersimpan memiliki tingkat risiko "<tingkat_risiko>"
    And laporan yang tersimpan mencatat pemindaian halaman berstatus "FAILED"
    And halaman hasil analisis menampilkan "Domain tidak ditemukan atau sudah tidak aktif"
    And browser tidak menulis laporan langsung ke Supabase

    Examples:
      | url                                | tingkat_risiko |
      | https://slotgacor88.invalid/daftar | HIGH           |
      | https://situs-biasa.invalid        | LOW            |

  Scenario Outline: Link yang tidak lengkap ditolak
    When pengguna memasukkan URL "<url>" pada form
    And pengguna menekan tombol SCAN
    Then form menampilkan pesan "<pesan>"
    And tidak ada data yang ditulis ke Supabase

    Examples:
      | url                      | pesan                                                    |
      | slotgacor88.bet          | Masukkan link lengkap yang diawali http:// atau https:// |
      | https://slotgacor88      | Link harus memuat nama domain yang lengkap               |
      | https://contoh situs.com | Link tidak boleh berisi spasi.                           |

  Scenario: Form menolak analisis jika URL dan gambar kosong
    When pengguna menekan tombol SCAN
    Then form menampilkan pesan "Masukkan URL atau unggah tangkapan layar terlebih dahulu."
    And tidak ada data yang ditulis ke Supabase

  Scenario: Layanan deteksi tidak dapat dihubungi
    Given layanan deteksi sedang tidak dapat dihubungi
    When pengguna memasukkan URL "https://slotgacor88.com" pada form
    And pengguna menekan tombol SCAN
    Then form menampilkan pesan "Layanan deteksi tidak dapat dihubungi"
    And tidak ada data yang ditulis ke Supabase
