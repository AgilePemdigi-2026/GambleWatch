Feature: Navigasi Header, Footer, dan Fitur Logout
  Sebagai pengguna publik maupun administrator
  Saya ingin mengakses tautan navigasi di header dan footer serta tombol Logout
  Agar dapat berpindah halaman dan mengakhiri sesi dengan mudah

  Scenario: Verifikasi elemen Header dan Footer pada halaman publik
    Given pengguna mengunjungi halaman publik "/privacy"
    Then header publik menampilkan menu "HOME", "GAMBLING ANALYSIS", dan "FEEDBACK"
    And footer publik menampilkan tautan "About Web", "Privacy Policy", dan "Contact Support"

  Scenario: Verifikasi tombol Logout pada Header Admin dan pengalihan ke halaman Sign In Admin
    Given admin menyiapkan simulasi sesi keluar
    When admin membuka halaman "/admin"
    Then header admin menampilkan menu "Beranda", "Hasil klasifikasi", dan "Umpan balik"
    And header admin menampilkan tombol "Logout"
    When admin menekan tombol "Logout" pada header
    Then sesi berakhir dan diarahkan ke "/sign-in/sign-in-admin"

  Scenario: Verifikasi tombol Logout pada Header Publik saat pengguna login
    Given pengguna memiliki sesi login aktif di browser
    When pengguna mengunjungi halaman publik "/my-analyses"
    Then header publik menampilkan tombol "LOGOUT"
    When pengguna menekan tombol "LOGOUT" pada header publik
    Then sesi berakhir dan diarahkan ke "/sign-in/sign-in-masyarakat"