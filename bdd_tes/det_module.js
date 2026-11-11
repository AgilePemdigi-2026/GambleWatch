// Step DET: memanggil mesin deteksi sungguhan.
// - "lewat form GambleWatch": route Next.js POST /api/analyze (yang dipakai form)
// - "mesin deteksi" dengan teks: API DET-06 POST /analyze langsung (form belum mengirim teks)
const assert = require('node:assert/strict');
const { Given, When, Then } = require('@cucumber/cucumber');
require('./support_playwright');

async function postForm(url, form) {
  const response = await fetch(url, { method: 'POST', body: form });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

Given('layanan deteksi GambleWatch aktif', async function () {
  const health = await fetch(`${this.apiUrl}/health`).catch(() => null);
  assert.ok(health && health.ok,
    `API deteksi tidak aktif di ${this.apiUrl}. Jalankan: python -m uvicorn detection_engine.api.main:app --port 8000`);
});

When('URL {string} dianalisis lewat form GambleWatch', async function (url) {
  const form = new FormData();
  form.set('url', url);
  this.result = await postForm(`${this.baseUrl}/api/analyze`, form);
  assert.equal(this.result.status, 200, JSON.stringify(this.result.body));
  this.summary = this.result.body.summary;
});

When('teks halaman {string} dianalisis mesin deteksi', async function (text) {
  const form = new FormData();
  form.set('page_text', text);
  this.result = await postForm(`${this.apiUrl}/analyze`, form);
  assert.equal(this.result.status, 200, JSON.stringify(this.result.body));
  this.summary = this.result.body;
});

When('form GambleWatch mengirim analisis tanpa URL dan tanpa tangkapan layar', async function () {
  this.result = await postForm(`${this.baseUrl}/api/analyze`, new FormData());
});

When('form GambleWatch mengirim tangkapan layar berupa berkas teks', async function () {
  const form = new FormData();
  form.set('screenshot', new Blob(['ini bukan gambar'], { type: 'image/png' }), 'palsu.png');
  this.result = await postForm(`${this.baseUrl}/api/analyze`, form);
});

Then('tingkat indikasi hasil analisis adalah {string}', function (indikasi) {
  assert.equal(this.summary.indication, indikasi,
    `skor ${this.summary.overall_score}, modul: ${JSON.stringify(this.summary.modules)}`);
});

Then('modul {string} mencatat temuan yang memuat {string}', function (modul, text) {
  const findings = this.summary.modules[modul].findings;
  assert.ok(findings.some((f) => f.includes(text)), `temuan ${modul}: ${JSON.stringify(findings)}`);
});

Then('potongan teks pertama menyorot kata {string}', function (word) {
  const passages = this.summary.modules.keyword_analysis.passages || [];
  assert.ok(passages.length, 'tidak ada potongan teks');
  assert.ok(passages[0].highlights.includes(word), `sorotan: ${JSON.stringify(passages[0].highlights)}`);
});

Then('modul {string} memberi label {string}', function (modul, label) {
  assert.equal(this.summary.modules[modul].label, label);
});

Then('analisis ditolak dengan pesan {string}', function (message) {
  assert.ok(this.result.status >= 400 && this.result.status < 500, `status ${this.result.status}`);
  assert.equal(this.result.body.message, message);
});
