// Step ADM: dashboard admin (/admin) dengan tabel laporan_analisis yang disimulasikan.
const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { buildLaporan, mockSupabaseTable } = require('./support_playwright');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

Given('data laporan untuk dashboard admin disimulasikan:', async function (table) {
  await mockSupabaseTable(this, 'laporan_analisis', table.hashes().map(buildLaporan));
});

// Kartu statistik: judul (span) dan angka (h2) berada di kartu yang sama
function statCard(page, title) {
  return page.locator('div.h-36', { has: page.getByText(title, { exact: true }) }).first();
}

Then('kartu {string} menampilkan angka {string}', async function (title, value) {
  await expect(statCard(this.page, title).locator('h2')).toHaveText(value, { timeout: 30000 });
});

Then('grafik {string} menampilkan {int} situs terindikasi pada bulan ini', async function (judul, count) {
  await expect(this.page.getByRole('heading', { name: judul })).toBeVisible();
  const bulanIni = MONTHS[new Date().getMonth()];
  // Tiap batang punya title "<bulan>: <n> situs terindikasi"
  await expect(this.page.locator(`[title="${bulanIni}: ${count} situs terindikasi"]`)).toBeVisible({ timeout: 30000 });
});

When('admin mengklik menu {string} pada section Akses cepat', async function (menu) {
  const section = this.page.locator('div.mb-10', { has: this.page.getByRole('heading', { name: 'Akses cepat' }) });
  await section.getByRole('link', { name: menu }).click({ timeout: 30000 });
});

Then('halaman berpindah ke rute {string}', async function (path) {
  await this.page.waitForURL((url) => url.pathname === path, { timeout: 60000 });
});
