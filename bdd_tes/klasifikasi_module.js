const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

Given('Admin membuka halaman hasil klasifikasi {string}', async function (url) {
  await this.page.goto(`http://localhost:3000${url}`);
});

Given('Admin berada di halaman {string}', async function (url) {
  await this.page.goto(`http://localhost:3000${url}`);
});

Then('Judul {string} harus terlihat di layar', async function (headingText) {
  const heading = this.page.locator('h1', { hasText: headingText });
  await expect(heading).toBeVisible();
});

Then('Tabel daftar laporan harus menampilkan situs URL, pelapor, dan tombol "Lihat Detail"', async function () {
  const detailBtn = this.page.locator('a:has-text("Lihat Detail")').first();
  await expect(detailBtn).toBeVisible();
});

When('Admin mengklik tombol "Lihat Detail" pada baris laporan pertama', async function () {
  const detailBtn = this.page.locator('a:has-text("Lihat Detail")').first();
  await detailBtn.click();
});

Then('Sistem mengarahkan URL ke rute verifikasi {string}', async function (pathPrefix) {
  await this.page.waitForURL(new RegExp(pathPrefix));
  expect(this.page.url()).toContain(pathPrefix);
});