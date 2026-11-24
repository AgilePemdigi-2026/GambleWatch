Feature: Form Analisis Situs Perjudian (ANL)
  Sebagai masyarakat
  Saya ingin menganalisis URL situs melalui form
  Agar laporan tersimpan dengan tingkat risiko dan hasil analisis yang sesuai

  Background:
    Given penyimpanan laporan di Supabase disimulasikan
    And pengguna membuka form analisis situs

  Scenario Outline: Analisis berbagai URL situs menghasilkan klasifikasi risiko yang sesuai
    When pengguna memasukkan URL "<url>" pada form
    And pengguna menekan tombol SCAN
    Then laporan yang tersimpan memiliki tingkat risiko "<tingkat_risiko>"
    And laporan yang tersimpan memiliki analisis pola URL berindikasi "<indikasi>"
    And halaman hasil analisis menampilkan risiko "<tingkat_risiko>"

    Examples:
      | url                       | tingkat_risiko | indikasi  |
      | slotgacor88.bet/daftar    | HIGH RISK      | High Risk |
      | situs-judi-online.com     | HIGH RISK      | High Risk |
      | www.tokopedia.com         | LOW RISK       | Low Risk  |
      | https://www.komdigi.go.id | LOW RISK       | Low Risk  |

  Scenario: Form menolak analisis jika URL dan gambar kosong
    When pengguna menekan tombol SCAN
    Then form menampilkan pesan "Masukkan URL atau unggah tangkapan layar terlebih dahulu."
    And tidak ada data yang ditulis ke Supabase