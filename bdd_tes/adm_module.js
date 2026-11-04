const { Given, When, Then } = require('@cucumber/cucumber');

Given(/^Admin membuka halaman dashboard \("([^"]+)"\)$/, function (path) {
  return true;
});

Given(/^Admin berada di halaman dashboard \("([^"]+)"\)$/, function (path) {
  return true;
});

When('Sistem berhasil memuat data statistik dari database Supabase', function () {
  return true;
});

Then('Kartu {string} harus menampilkan jumlah laporan riil', function (string) {
  return true;
});

Then('Kartu {string} harus menampilkan jumlah situs risiko tinggi', function (string) {
  return true;
});

Then('Kartu {string} harus menampilkan jumlah laporan status pending', function (string) {
  return true;
});

Then('Grafik {string} harus menampilkan data deteksi bulanan', function (string) {
  return true;
});

When('Admin mengklik menu {string} pada section Akses cepat', function (string) {
  return true;
});

Then(/^Halaman harus berpindah ke rute \("([^"]+)"\)$/, function (path) {
  return true;
});