const assert = require('node:assert/strict');
const { Given, When, Then } = require('@cucumber/cucumber');
const { mockSupabaseTable, expectText } = require('./support_playwright');

Given('penyimpanan laporan di Supabase disimulasikan', async function () {
  this.laporan = [];
  await mockSupabaseTable(this, 'laporan_analisis', this.laporan);
});

Given('pengguna membuka form analisis situs', async function () {
  const page = await this.getPage();
  await page.goto(`${this.baseUrl}/form-gamblin-analysis`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('https://contoh-situs.com').waitFor({ timeout: 30000 });
  await page.waitForFunction(() => {
    const input = document.querySelector('input[placeholder="https://contoh-situs.com"]');
    return !!input && Object.keys(input).some((key) => key.startsWith('__reactProps'));
  }, null, { timeout: 30000 });
});

When('pengguna memasukkan URL {string} pada form', async function (url) {
  const page = await this.getPage();
  await page.getByPlaceholder('https://contoh-situs.com').fill(url);
});

When('pengguna menekan tombol SCAN', async function () {
  const page = await this.getPage();
  await page.getByRole('button', { name: 'SCAN' }).click();
  await Promise.race([
    page.waitForURL('**/form-gamblin-analysis/result?id=*', { timeout: 30000 }),
    page.getByRole('button', { name: 'SCAN' }).waitFor({ timeout: 30000 }),
  ]).catch(() => {});
});

function savedLaporan(world) {
  const write = world.writes.find((w) => w.table === 'laporan_analisis' && w.method === 'POST');
  assert.ok(write, 'form tidak menyimpan laporan');
  return write.body;
}

Then('laporan yang tersimpan memiliki tingkat risiko {string}', async function (risiko) {
  const page = await this.getPage();
  await page.waitForURL('**/form-gamblin-analysis/result?id=*', { timeout: 30000 });
  assert.equal(savedLaporan(this).tingkat_risiko, risiko);
});

Then('laporan yang tersimpan memiliki analisis pola URL berindikasi {string}', function (indikasi) {
  const pattern = savedLaporan(this).url_pattern_analysis;
  assert.ok(pattern, 'kolom url_pattern_analysis kosong');
  assert.ok(pattern.includes(indikasi), `expected "${pattern}" to include "${indikasi}"`);
});

Then('halaman hasil analisis menampilkan risiko {string}', async function (risiko) {
  await expectText(await this.getPage(), risiko);
});

Then('form menampilkan pesan {string}', async function (message) {
  await expectText(await this.getPage(), message);
});