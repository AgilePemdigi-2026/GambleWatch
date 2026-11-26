// Step ANL: unggah gambar bukti di form analisis dan tindakan di halaman hasil indikasi.
// Tabel laporan_analisis disimulasikan oleh step "penyimpanan laporan di Supabase disimulasikan"
// (anl_integrasi_module.js), jadi tes tidak pernah menulis ke database tim.
const assert = require('node:assert/strict');
const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { buildLaporan } = require('./support_playwright');

const SCAN_TIMEOUT = { timeout: 120 * 1000 };

// Buat PNG berisi teks besar (bahan OCR) dengan merender HTML di tab terpisah
async function renderTextImage(context, text) {
  const tab = await context.newPage();
  await tab.setViewportSize({ width: 900, height: 260 });
  await tab.setContent(`<body style="margin:0;background:#fff;display:flex;align-items:center;justify-content:center;height:260px">
    <div style="font:bold 54px Arial,sans-serif;color:#000;text-align:center">${text}</div></body>`);
  const buffer = await tab.screenshot({ type: 'png' });
  await tab.close();
  return buffer;
}

When('pengguna memilih gambar bukti bertuliskan {string}', async function (text) {
  const buffer = await renderTextImage(this.context, text);
  await this.page.locator('input[type="file"]').setInputFiles({
    name: 'bukti_situs.png', mimeType: 'image/png', buffer,
  });
});

Then('pengguna diarahkan ke halaman hasil indikasi', SCAN_TIMEOUT, async function () {
  await this.page.waitForURL('**/form-gamblin-analysis/result?id=*', { timeout: 110000 });
  await expect(this.page.getByRole('heading', { name: 'Analysis Results' })).toBeVisible({ timeout: 60000 });
});

Then('laporan yang tersimpan berisi teks OCR {string}', function (kata) {
  const write = this.writes.find((w) => w.table === 'laporan_analisis (server)');
  assert.ok(write, 'server tidak menyimpan laporan');
  const ocr = write.body.bukti_deteksi && write.body.bukti_deteksi.teks_ocr;
  assert.ok(ocr, 'teks OCR kosong: apakah Tesseract OCR sudah terpasang di mesin API deteksi?');
  assert.ok(ocr.toUpperCase().includes(kata), `teks OCR: ${ocr}`);
});

Given('ada laporan analisis dengan ID {int} berstatus {string}', function (id, status) {
  this.laporan.push(buildLaporan({
    id: String(id), url: 'https://slot-gacor-maxwin.example', risiko: 'HIGH', skor: '92',
    status, waktu: '1 jam lalu', temuan: 'keyword_analysis: slot gacor, maxwin',
  }, 0));
});

Given('pengguna membuka halaman hasil indikasi laporan {int}', async function (id) {
  await this.page.goto(`${this.baseUrl}/form-gamblin-analysis/result?id=${id}`, { waitUntil: 'networkidle' });
  await expect(this.page.getByText(`ID-${id}`)).toBeVisible({ timeout: 60000 });
});

When('pengguna menekan tombol {string}', async function (name) {
  await this.page.getByRole('button', { name }).click({ timeout: 30000 });
});

Then('status laporan {int} diubah menjadi {string} di tabel {string}', async function (id, status, table) {
  await expect.poll(() => this.writes.find((w) => w.table === table && w.method === 'PATCH' && w.id === id))
    .toBeTruthy();
  const patch = this.writes.find((w) => w.table === table && w.method === 'PATCH' && w.id === id);
  assert.equal(patch.body.status, status);
});

Then('laporan {int} dihapus dari tabel {string}', async function (id, table) {
  await expect.poll(() => this.writes.some((w) => w.table === table && w.method === 'DELETE' && w.id === id))
    .toBe(true);
});

Then('pengguna diarahkan kembali ke halaman form {string}', async function (path) {
  await this.page.waitForURL((url) => url.pathname === path, { timeout: 60000 });
});
