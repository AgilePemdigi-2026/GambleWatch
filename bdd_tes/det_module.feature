Feature: Mesin Deteksi Situs Judi Online (DET-01 sampai DET-06)
  Sebagai sistem GambleWatch
  Saya ingin menilai URL, teks, dan tangkapan layar dengan mesin deteksi
  Agar setiap laporan mendapat indikasi Rendah, Sedang, atau Tinggi beserta buktinya

  Background:
    Given layanan deteksi GambleWatch aktif

  Scenario Outline: Menilai indikasi judi dari pola sebuah URL (DET-01)
    When pola URL "<url>" dinilai mesin deteksi
    Then tingkat indikasi hasil analisis adalah "<indikasi>"

    Examples:
      | url                            | indikasi |
      | https://slotgacor88.bet/daftar | Tinggi   |
      | https://zeus123.xyz            | Tinggi   |
      | https://mpo500king.com         | Tinggi   |
      | https://www.tokopedia.com      | Rendah   |
      | https://dewa19.com             | Rendah   |
      | https://www.zeus.com           | Rendah   |

  Scenario: Nama merek judi "kata + angka" dicatat sebagai temuan
    When pola URL "https://zeus123.xyz" dinilai mesin deteksi
    Then modul "url_pattern" mencatat temuan yang memuat "zeus123"

  Scenario: Teks promosi judi menghasilkan potongan kalimat yang disorot
    When teks halaman "Daftar slot gacor maxwin hari ini, bonus new member 100%, deposit pulsa tanpa potongan." dianalisis mesin deteksi
    Then tingkat indikasi hasil analisis adalah "Tinggi"
    And potongan teks pertama menyorot kata "slot gacor"

  Scenario: Berita tentang judi online tidak ditandai sebagai situs judi
    When teks halaman "Polisi menangkap tersangka kasus judi online. Komdigi memblokir ribuan situs judi. OJK mengimbau masyarakat waspada terhadap bahaya judi dan dampak kecanduan judi." dianalisis mesin deteksi
    Then modul "keyword_analysis" memberi label "No Keywords"

  Scenario Outline: Link yang tidak lengkap ditolak form GambleWatch
    When form GambleWatch mengirim link "<url>"
    Then analisis ditolak dengan pesan "<pesan>"

    Examples:
      | url               | pesan                                                                                       |
      | zeus123.xyz       | Masukkan link lengkap yang diawali http:// atau https://, contoh: https://contoh-situs.com |
      | https://zeus123   | Link harus memuat nama domain yang lengkap (mis. .com, .id, .xyz). Contoh: https://contoh-situs.com |

  Scenario: Analisis tanpa URL dan tanpa tangkapan layar ditolak
    When form GambleWatch mengirim analisis tanpa URL dan tanpa tangkapan layar
    Then analisis ditolak dengan pesan "Masukkan URL atau unggah tangkapan layar terlebih dahulu."

  Scenario: Tangkapan layar yang bukan gambar ditolak
    When form GambleWatch mengirim tangkapan layar berupa berkas teks
    Then analisis ditolak dengan pesan "Berkas bukan gambar yang valid. Gunakan JPG atau PNG."
