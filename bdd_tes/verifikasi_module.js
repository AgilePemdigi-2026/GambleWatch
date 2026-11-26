const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { buildLaporan, mockSupabaseTable } = require('./support_playwright');

// Laporan disimulasikan (page.route): tes selalu punya data yang sama dan
// tombol "Update Status" tidak pernah mengubah laporan asli di database.
async function bukaVerifikasi(world, url) {
  const id = (/\/admin\/verifikasi\/(\d+)/.exec(url) || [])[1] || '126';
  await mockSupabaseTable(world, 'laporan_analisis', [
    buildLaporan({
      id, url: 'https://slot-gacor-maxwin.example', risiko: 'HIGH', skor: '92',
      status: 'Menunggu Verifikasi (Pending)', waktu: '1 jam lalu', pelapor: 'user-bdd-1',
      temuan: 'keyword_analysis: slot gacor, maxwin',
    }, 0),
  ]);
  const page = await world.getPage();
  await page.goto(`${world.baseUrl}${url}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('slot-gacor-maxwin.example').first()).toBeVisible({ timeout: 30000 });
}

Given('Admin membuka halaman verifikasi laporan {string}', async function (url) {
  await bukaVerifikasi(this, url);
});

Given('Admin membuka halaman detail verifikasi laporan {string}', async function (url) {
  await bukaVerifikasi(this, url);
});

Given('Admin sedang berada di halaman verifikasi {string}', async function (url) {
  await bukaVerifikasi(this, url);
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
  // Harus toast SUKSES, bukan sembarang toast (mis. toast error gagal memuat)
  const toastItem = this.page.locator('[data-sonner-toast]', { hasText: 'berhasil diperbarui' }).first();
  await expect(toastItem).toBeVisible({ timeout: 10000 });
  const update = this.writes.find((w) => w.table === 'laporan_analisis' && w.method === 'PATCH');
  if (!update) throw new Error('Status tidak dikirim ke Supabase (tidak ada PATCH laporan_analisis)');
});

Then('Admin diubah arahnya kembali ke halaman {string}', async function (urlTarget) {
  await this.page.waitForURL(`${this.baseUrl}${urlTarget}`, { timeout: 10000 });
  expect(this.page.url()).toBe(`${this.baseUrl}${urlTarget}`);
});

When('Admin mengklik tombol "Riwayat Audit"', async function () {
  const btnAudit = this.page.locator('button:has-text("Riwayat Audit")');
  await btnAudit.click();
});

Then('Modal riwayat audit laporan harus terbuka di layar', async function () {
  const modalHeader = this.page.locator('h3:has-text("Riwayat Audit")');
  await expect(modalHeader).toBeVisible();
});