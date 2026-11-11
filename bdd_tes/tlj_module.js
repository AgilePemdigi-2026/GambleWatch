// Step TLJ: halaman /admin/verifikasi/[id] membaca laporan_analisis.bukti_deteksi.
const assert = require('node:assert/strict');
const { Given, Then } = require('@cucumber/cucumber');
const { buildLaporan, mockSupabaseTable } = require('./support_playwright');

Given('laporan {int} berisiko tinggi dengan bukti deteksi lengkap', async function (id) {
  const row = buildLaporan({ id, url: 'https://slotgacor88.bet/daftar', risiko: 'HIGH', skor: '96', status: 'SUBMITTED', waktu: '1 jam lalu' }, 0);
  row.bukti_deteksi = {
    versi: 1, request_id: 'bdd-tlj', dianalisis_pada: row.created_at, skor: 96, indikasi: 'Tinggi', waktu_proses_ms: 40,
    modul: {
      url_pattern: { status: 'ok', label: 'High Risk Pattern', skor: 96, temuan: ['Gambling TLD detected: .bet'] },
      visual_similarity: { status: 'skipped', label: 'Skipped', skor: 0, temuan: [] },
      ocr: { status: 'skipped', label: 'Skipped', skor: 0, temuan: [] },
      keyword_analysis: { status: 'ok', label: 'Keywords Found', skor: 92, temuan: ['slot gacor', 'maxwin'] },
    },
    potongan_teks: [{
      kalimat: 'daftar slot gacor maxwin hari ini', highlight: ['slot gacor', 'maxwin'],
      kategori: 'slot', sumber: 'teks halaman',
    }],
    teks_ocr: null,
  };
  await mockSupabaseTable(this, 'laporan_analisis', [row]);
});

Given('laporan {int} tanpa bukti deteksi', async function (id) {
  const row = buildLaporan({ id, url: 'http://contoh-lama.xyz', risiko: 'PENDING', status: 'DRAFT', waktu: '3 hari lalu' }, 0);
  await mockSupabaseTable(this, 'laporan_analisis', [row]);
});

Then('potongan teks bukti menyorot kata {string}', async function (word) {
  const page = await this.getPage();
  const marks = page.locator('[data-testid="flagged-snippets"] mark');
  await marks.first().waitFor({ timeout: 60000 });
  const texts = await marks.allInnerTexts();
  assert.ok(texts.some((t) => t.trim() === word), `kata yang disorot: ${JSON.stringify(texts)}`);
});
