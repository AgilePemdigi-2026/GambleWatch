// Step ANL + DET-06: form /form-gamblin-analysis -> /api/analyze -> API deteksi POST /scan
// (membuka link, menilai URL + isi halaman + screenshot), lalu menyimpan ke laporan_analisis.
// Penyimpanan Supabase (tabel dan Storage) disimulasikan; mesin deteksi asli dipakai kecuali
// pada skenario yang menyimulasikan respons /api/analyze.
const assert = require('node:assert/strict');
const { Given, When, Then } = require('@cucumber/cucumber');
const { mockSupabaseTable, expectText } = require('./support_playwright');

const URL_INPUT = 'https://contoh-situs.com';
// Pemindaian link bisa makan waktu; batas bawaan step di modul lain hanya 15 detik
const SCAN_TIMEOUT = { timeout: 120 * 1000 };

Given('penyimpanan laporan di Supabase disimulasikan', async function () {
  this.laporan = [];
  await mockSupabaseTable(this, 'laporan_analisis', this.laporan);
  const page = await this.getPage();
  await page.route('**/storage/v1/object/**', (route) => {
    this.writes.push({ table: 'storage', method: route.request().method() });
    return route.fulfill({ status: 200, json: { Key: 'bukti-analisis/uji.png' } });
  });
});

Given('pengguna membuka form analisis situs', SCAN_TIMEOUT, async function () {
  const page = await this.getPage();
  await page.goto(`${this.baseUrl}/form-gamblin-analysis`, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder(URL_INPUT).waitFor({ timeout: 60000 });
  // Input sudah terlihat dari HTML server sebelum React aktif (hydration). Mengetik
  // sebelum itu tidak masuk ke state form, jadi tunggu sampai React memasang handler-nya.
  await page.waitForFunction((placeholder) => {
    const input = document.querySelector(`input[placeholder="${placeholder}"]`);
    return !!input && Object.keys(input).some((key) => key.startsWith('__reactProps'));
  }, URL_INPUT, { timeout: 60000 });
});

Given('mesin deteksi membuka link dan menemukan promosi judi di isi halamannya', async function () {
  const page = await this.getPage();
  await page.route('**/api/analyze', (route) => route.fulfill({
    status: 200,
    json: {
      success: true,
      url: 'https://situs-netral.com',
      summary: {
        request_id: 'bdd-scan', overall_score: 0.91, overall_risk: 'high', indication: 'Tinggi',
        processing_time_ms: 4200,
        modules: {
          url_pattern: { status: 'ok', label: 'Normal', score: 0, findings: [] },
          visual_similarity: { status: 'skipped', label: 'Skipped', score: 0, findings: [] },
          ocr: { status: 'ok', label: 'Clear', score: 0, findings: [] },
          keyword_analysis: {
            status: 'ok', label: 'Keywords Found', score: 0.91, findings: ['slot gacor', 'maxwin'],
            passages: [{ text: 'Daftar slot gacor maxwin hari ini, deposit pulsa', highlights: ['slot gacor', 'maxwin'], category: 'slot' }],
          },
        },
        scan: {
          status: 'SUCCESS', failure_code: null,
          message: 'Halaman berhasil dibuka dan isinya dianalisis.',
          requested_url: 'https://situs-netral.com', final_url: 'https://situs-netral.com/',
          http_status: 200, title: 'Beranda Promo', redirect_chain: [], text_chars: 1200,
          links: 14, load_ms: 3100, screenshot_source: null, screenshot_base64: null,
        },
      },
    },
  }));
});

Given('layanan deteksi sedang tidak dapat dihubungi', async function () {
  const page = await this.getPage();
  await page.route('**/api/analyze', (route) => route.fulfill({
    status: 503,
    json: { success: false, message: 'Layanan deteksi tidak dapat dihubungi. Pastikan API deteksi berjalan.' },
  }));
});

When('pengguna memasukkan URL {string} pada form', async function (url) {
  const page = await this.getPage();
  await page.getByPlaceholder(URL_INPUT).fill(url);
});

When('pengguna menekan tombol SCAN', SCAN_TIMEOUT, async function () {
  const page = await this.getPage();
  await page.getByRole('button', { name: 'SCAN' }).click();
  // Selesai bila pindah ke halaman hasil, atau tombol kembali ke "SCAN" (gagal/ditolak)
  await Promise.race([
    page.waitForURL('**/form-gamblin-analysis/result?id=*', { timeout: 110000 }),
    page.getByRole('button', { name: 'SCAN' }).waitFor({ timeout: 110000 }),
  ]).catch(() => {});
});

function savedLaporan(world) {
  const write = world.writes.find((w) => w.table === 'laporan_analisis' && w.method === 'POST');
  assert.ok(write, 'form tidak menyimpan laporan');
  return write.body;
}

Then('laporan yang tersimpan memiliki tingkat risiko {string}', SCAN_TIMEOUT, async function (risiko) {
  const page = await this.getPage();
  await page.waitForURL('**/form-gamblin-analysis/result?id=*', { timeout: 110000 });
  const laporan = savedLaporan(this);
  assert.equal(laporan.tingkat_risiko, risiko, `skor ${laporan.skor_probabilitas}`);
  assert.ok(laporan.bukti_deteksi, 'kolom bukti_deteksi kosong');
});

Then('laporan yang tersimpan mencatat halaman {string} berhasil dibuka', function (judul) {
  const halaman = savedLaporan(this).bukti_deteksi.halaman;
  assert.ok(halaman, 'bukti_deteksi.halaman kosong');
  assert.equal(halaman.status, 'SUCCESS');
  assert.equal(halaman.judul, judul);
});

Then('laporan yang tersimpan memiliki kata kunci {string}', function (kata) {
  const laporan = savedLaporan(this);
  assert.ok(laporan.keywords_found.includes(kata), `keywords_found: ${laporan.keywords_found}`);
  assert.ok(laporan.bukti_deteksi.potongan_teks.length > 0, 'potongan teks kosong');
});

Then('halaman hasil analisis menampilkan {string}', SCAN_TIMEOUT, async function (text) {
  await expectText(await this.getPage(), text);
});

Then('form menampilkan pesan {string}', SCAN_TIMEOUT, async function (message) {
  await expectText(await this.getPage(), message);
});
