const { Given, When, Then, setDefaultTimeout } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

// Set timeout global Cucumber 15 detik
setDefaultTimeout(15 * 1000);

// Menangani step "membuka" dan "detail" (mengatasi undefined scenario)
Given('Admin membuka halaman verifikasi laporan {string}', async function (url) {
  await this.page.goto(`http://localhost:3000${url}`);
});

Given('Admin membuka halaman detail verifikasi laporan {string}', async function (url) {
  await this.page.goto(`http://localhost:3000${url}`);
});

Given('Admin sedang berada di halaman verifikasi {string}', async function (url) {
  await this.page.goto(`http://localhost:3000${url}`);
});

Then('Judul halaman {string} harus muncul di layar', async function (headingText) {
  const heading = this.page.locator('h1', { hasText: headingText });
  await expect(heading).toBeVisible();
});

Then('Kartu informasi situs, skor probabilitas, pelapor, dan tingkat risiko harus ditampilkan', async function () {
  const siteInformationCard = this.page.locator('[data-testid="site-information"]');
  await expect(siteInformationCard).toBeVisible();
});

When('Admin memilih status regulasi {string}', async function (status) {
  const statusDropdown = this.page.locator('[data-testid="status-dropdown"]');
  await statusDropdown.selectOption({ label: status });
});

When('Admin mengisikan nomor surat {string}', async function (noSurat) {
  const inputSurat = this.page.locator('input[placeholder="KOMDIGI/DIT-APT/VI/2026/8912"]');
  await inputSurat.fill(noSurat);
});

When('Admin mengisikan catatan petugas {string}', async function (catatanText) {
  const notesTextarea = this.page.locator('[data-testid="admin-notes"]');
  await notesTextarea.fill(catatanText);
});

When('Admin mengklik tombol "Update Status"', async function () {
  const btnUpdate = this.page.locator('button:has-text("Update Status")');
  await btnUpdate.click();
});

Then('Toast notifikasi pembaruan status harus muncul', async function () {
  // Menargetkan item toast spesifik (li) bukan container-nya (ol)
  const toastItem = this.page.locator('[data-sonner-toast], li[data-mounted="true"], [role="status"]').first();
  await expect(toastItem).toBeVisible({ timeout: 10000 });
});

Then('Admin diubah arahnya kembali ke halaman {string}', async function (urlTarget) {
  await this.page.waitForURL(`http://localhost:3000${urlTarget}`, { timeout: 10000 });
  expect(this.page.url()).toBe(`http://localhost:3000${urlTarget}`);
});

When('Admin mengklik tombol "Riwayat Audit"', async function () {
  const btnAudit = this.page.locator('button:has-text("Riwayat Audit")');
  await btnAudit.click();
});

Then('Modal riwayat audit laporan harus terbuka di layar', async function () {
  const modalHeader = this.page.locator('h3:has-text("Riwayat Audit")');
  await expect(modalHeader).toBeVisible();
});