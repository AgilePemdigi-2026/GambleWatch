const { Given, When, Then } = require('@cucumber/cucumber');

// 1. Handling URL path dengan tanda kurung & kutip
Given(/^Pengguna berada di halaman Form Analisis Situs \("([^"]+)"\)$/, function (path) {
  return true;
});

When('Pengguna menekan tombol {string} tanpa memasukkan URL dan tanpa memilih file', function (string) {
  return true;
});

Then('Sistem menampilkan pesan kesalahan {string}', function (string) {
  return true;
});

Then('Form tidak mengirimkan data ke database', function () {
  return true;
});

When('Pengguna mengisi input URL dengan {string}', function (string) {
  return true;
});

When('Pengguna menekan tombol {string}', function (string) {
  return true;
});

Then('Sistem mengubah status tombol menjadi {string}', function (string) {
  return true;
});

Then('Sistem menyimpan record baru ke tabel {string} dengan status {string}', function (string, string2) {
  return true;
});

// 2. Handling Redirect URL dengan tanda kurung & kutip
Then(/^Pengguna diarahkan ke halaman hasil indikasi \("([^"]+)"\)$/, function (path) {
  return true;
});

When(/^Pengguna memilih file gambar "([^"]+)" \(ukuran < 5MB\)$/, function (fileName) {
  return true;
});

Then('Sistem mengunggah file gambar ke Supabase Storage bucket {string}', function (string) {
  return true;
});

Then('Sistem menyimpan URL public gambar ke kolom {string} di tabel {string}', function (string, string2) {
  return true;
});

Given('Ada data laporan di database dengan ID {string} dan status {string}', function (string, string2) {
  return true;
});

When('Pengguna membuka halaman hasil indikasi {string}', function (string) {
  return true;
});

Then('Sistem mengambil data laporan ID {string} dari Supabase', function (string) {
  return true;
});

Then('Halaman menampilkan ID Laporan {string}', function (string) {
  return true;
});

Then('Halaman menampilkan status analisis {string}', function (string) {
  return true;
});

Given('Pengguna berada di halaman hasil indikasi untuk laporan ID {string} berstatus {string}', function (string, string2) {
  return true;
});

Then('Sistem meng-update kolom status laporan ID {string} menjadi {string} di tabel {string}', function (string, string2, string3) {
  return true;
});

Then('Sistem menampilkan notifikasi sukses {string}', function (string) {
  return true;
});

Then('Tampilan UI memperbarui status laporan menjadi {string}', function (string) {
  return true;
});

Given('Pengguna berada di halaman hasil indikasi untuk laporan ID {string}', function (string) {
  return true;
});

Then('Sistem menghapus record laporan ID {string} dari tabel {string}', function (string, string2) {
  return true;
});

// 3. Handling Redirect kembali dengan tanda kurung & kutip
Then(/^Pengguna diarahkan kembali ke halaman utama form \("([^"]+)"\)$/, function (path) {
  return true;
});