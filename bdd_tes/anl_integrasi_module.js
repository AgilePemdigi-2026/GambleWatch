// Step ANL + DET-06: form /form-gamblin-analysis memanggil /api/analyze (mesin deteksi asli),
// lalu menyimpan ke laporan_analisis. Penyimpanan Supabase disimulasikan.
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
  await page.getByPlaceholder('http://slot-xxx-00-xxxxx.xyz').waitFor({ timeout: 60000 });
  // Input sudah terlihat dari HTML server sebelum React aktif (hydration). Mengetik
  // sebelum itu tidak masuk ke state form, jadi tunggu sampai React memasang handler-nya.
  await page.waitForFunction(() => {
    const input = document.querySelector('input[placeholder="http://slot-xxx-00-xxxxx.xyz"]');
    return !!input && Object.keys(input).some((key) => key.startsWith('__reactProps'));
  }, null, { timeout: 60000 });
});

Given('layanan deteksi sedang tidak dapat dihubungi', async function () {
  const page = await this.getPage();
  await page.route('**/api/analyze', (route) => route.fulfill({
    status: 503,
    json: { success: false, message: 'Layanan deteksi tidak dapat dihubungi. Pastikan API deteksi berjalan.' },
  }));
});

When('pengguna menganalisis URL {string} melalui form', async function (url) {
  const page = await this.getPage();
  await page.getByPlaceholder('http://slot-xxx-00-xxxxx.xyz').fill(url);
  await page.getByRole('button', { name: 'SCAN' }).click();
  // Tunggu sampai form selesai: pindah ke halaman hasil, atau tombol kembali ke "SCAN"
  await Promise.race([
    page.waitForURL('**/form-gamblin-analysis/result?id=*', { timeout: 60000 }),
    page.getByRole('button', { name: 'SCAN' }).waitFor({ timeout: 60000 }),
  ]).catch(() => {});
});

function savedLaporan(world) {
  const write = world.writes.find((w) => w.table === 'laporan_analisis' && w.method === 'POST');
  assert.ok(write, 'form tidak menyimpan laporan');
  return write.body;
}

Then('laporan yang tersimpan memiliki tingkat risiko {string}', async function (risiko) {
  const page = await this.getPage();
  await page.waitForURL('**/form-gamblin-analysis/result?id=*', { timeout: 60000 });
  assert.equal(savedLaporan(this).tingkat_risiko, risiko);
});

Then('laporan yang tersimpan memiliki bukti deteksi berindikasi {string}', function (indikasi) {
  const bukti = savedLaporan(this).bukti_deteksi;
  assert.ok(bukti, 'kolom bukti_deteksi kosong');
  assert.equal(bukti.indikasi, indikasi);
  assert.ok(bukti.modul.url_pattern.temuan.length > 0, 'temuan pola URL kosong');
});

Then('halaman hasil analisis menampilkan risiko {string}', async function (risiko) {
  await expectText(await this.getPage(), risiko);
});

Then('form menampilkan pesan {string}', async function (message) {
  await expectText(await this.getPage(), message);
});
