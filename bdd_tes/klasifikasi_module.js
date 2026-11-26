const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { buildLaporan, mockSupabaseTable } = require('./support_playwright');

// Data laporan disimulasikan (page.route) agar tes tidak bergantung pada isi database.
const CONTOH_LAPORAN = [
  { id: '501', url: 'https://slot-gacor-maxwin.example', risiko: 'HIGH', skor: '92', status: 'PENDING', waktu: '1 jam lalu', pelapor: 'user-bdd-1' },
  { id: '502', url: 'https://toko-buku.example', risiko: 'LOW', skor: '8', status: 'PENDING', waktu: '3 hari lalu', pelapor: 'user-bdd-2' },
];

async function bukaHasilKlasifikasi(world, url) {
  await mockSupabaseTable(world, 'laporan_analisis', CONTOH_LAPORAN.map(buildLaporan));
  const page = await world.getPage();
  await page.goto(`${world.baseUrl}${url}`, { waitUntil: 'domcontentloaded' });
}

Given('Admin membuka halaman hasil klasifikasi {string}', async function (url) {
  await bukaHasilKlasifikasi(this, url);
});

Given('Admin berada di halaman {string}', async function (url) {
  await bukaHasilKlasifikasi(this, url);
});

Then('Judul {string} harus terlihat di layar', async function (headingText) {
  const heading = this.page.locator('h1', { hasText: headingText });
  await expect(heading).toBeVisible({ timeout: 30000 });
});

Then('Tabel daftar laporan harus menampilkan situs URL, pelapor, dan tombol "Lihat Detail"', async function () {
  await expect(this.page.getByText('slot-gacor-maxwin.example').first()).toBeVisible({ timeout: 30000 });
  const detailBtn = this.page.locator('a:has-text("Lihat Detail")').first();
  await expect(detailBtn).toBeVisible();
});

When('Admin mengklik tombol "Lihat Detail" pada baris laporan pertama', async function () {
  const detailBtn = this.page.locator('a:has-text("Lihat Detail")').first();
  await detailBtn.click({ timeout: 30000 });
});

Then('Sistem mengarahkan URL ke rute verifikasi {string}', async function (pathPrefix) {
  await this.page.waitForURL(new RegExp(pathPrefix), { timeout: 30000 });
  expect(this.page.url()).toContain(pathPrefix);
});
