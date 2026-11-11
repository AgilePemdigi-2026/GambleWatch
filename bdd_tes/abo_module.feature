Feature: Halaman About dan Kebijakan Privasi (ABO-01, ABO-02)
  Sebagai masyarakat
  Saya ingin membaca penjelasan tentang GambleWatch dan kebijakan privasinya
  Agar saya memahami tujuan sistem dan bagaimana data laporan saya dipakai

  Scenario: Membaca halaman About
    When pengunjung membuka halaman publik "/about"
    Then judul halaman browser adalah "Tentang GambleWatch"
    And halaman menampilkan judul utama "Apa itu gamblewatch?"
    And halaman menampilkan bagian "Misi Kami", "Cara Kerja Kami", dan "Transparansi Publik"

  Scenario: Membaca halaman Kebijakan Privasi
    When pengunjung membuka halaman publik "/kebijakan-privasi"
    Then judul halaman browser adalah "Kebijakan Privasi | GambleWatch"
    And halaman menampilkan judul utama "Kebijakan Privasi"
    And halaman menampilkan bagian "Pengumpulan dan penggunaan informasi", "Keamanan Data", dan "Perubahan kebijakan"

  Scenario: Berpindah dari About ke Kebijakan Privasi lewat footer
    When pengunjung membuka halaman publik "/about"
    And pengunjung memilih tautan footer "Privacy Policy"
    Then alamat halaman publik menjadi "/kebijakan-privasi"

  Scenario: Berpindah dari Kebijakan Privasi ke About lewat footer
    When pengunjung membuka halaman publik "/kebijakan-privasi"
    And pengunjung memilih tautan footer "About Web"
    Then alamat halaman publik menjadi "/about"
