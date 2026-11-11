const { Given, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

// Timeout global Cucumber 15 detik
setDefaultTimeout(15 * 1000);

Given('Pengguna membuka halaman analisis {string}', async function (urlPath) {
  await this.page.goto(`http://localhost:3000${urlPath}`);
});

Given('Pengguna berada di halaman {string}', async function (urlPath) {
  await this.page.goto(`http://localhost:3000${urlPath}`);
});

When('Pengguna mengisi input URL {string}', async function (urlInput) {
  const inputUrl = this.page.locator('input[placeholder="http://slot-xxx-00-xxxxx.xyz"]');
  await inputUrl.fill(urlInput);
});

When('Pengguna mengklik tombol SCAN', async function () {
  const btnScan = this.page.locator('button:has-text("SCAN")');
  await btnScan.click();
});

Then('Pengguna diarahkan ke halaman hasil analisis', async function () {
  await this.page.waitForURL(/\/form-gamblin-analysis\/result/, { timeout: 15000 });
  expect(this.page.url()).toContain('/form-gamblin-analysis/result');
});

When('Pengguna mengklik tombol "MY ANALYSES" pada header', async function () {
  const btnMyAnalyses = this.page.locator('header').locator('a:has-text("MY ANALYSES"), button:has-text("MY ANALYSES")').first();
  await expect(btnMyAnalyses).toBeVisible({ timeout: 10000 });
  await btnMyAnalyses.click();
});

Then('Pengguna harus diarahkan ke halaman {string}', async function (urlTarget) {
  // Gunakan waitUntil 'domcontentloaded' atau 'commit' agar tidak hang menunggu full page load Next.js
  await this.page.waitForURL(`http://localhost:3000${urlTarget}`, { 
    timeout: 10000,
    waitUntil: 'domcontentloaded' 
  });
  expect(this.page.url()).toBe(`http://localhost:3000${urlTarget}`);
});

Then('Judul halaman {string} harus tampil di layar', async function (headingText) {
  const heading = this.page.locator('h1', { hasText: headingText });
  await expect(heading).toBeVisible({ timeout: 10000 });
});

Then('Teks indikator {string} atau daftar analisis harus tampil di layar', async function (emptyText) {
  const emptyState = this.page.locator(`text="${emptyText}"`);
  const analysisItem = this.page.locator('[data-testid="analysis-item"]').first();
  
  await expect(emptyState.or(analysisItem)).toBeVisible({ timeout: 10000 });
});