// Step EWR: halaman peringatan dini (/admin/early-warning) dan detail sinyal, dengan
// tabel laporan_analisis yang disimulasikan.
const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');
const { buildLaporan, mockSupabaseTable } = require('./support_playwright');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

Given('data sinyal peringatan dini disimulasikan:', async function (table) {
  const rows = table.hashes().map((row, i) => {
    const laporan = buildLaporan(row, i);
    if (row.temuan) laporan.keywords_found = `Keywords Found: ${row.temuan.split(':')[1].trim()}`;
    return laporan;
  });
  await mockSupabaseTable(this, 'laporan_analisis', rows);
});

// --- Kartu sinyal ---

// Tiap kartu sinyal: div berisi nama domain (span.font-mono) dan badge persentase
function signalCards(page) {
  return page.locator('div.grid > div.bg-\\[\\#FAF5EE\\]', { has: page.locator('span.font-mono') });
}

Then('halaman EWR menampilkan {int} kartu sinyal anomali', async function (count) {
  await expect(signalCards(this.page)).toHaveCount(count, { timeout: 30000 });
});

Then('kartu domain {string} menampilkan peningkatan risiko {string}', async function (domain, percentage) {
  const card = signalCards(this.page).filter({ hasText: domain });
  await expect(card).toContainText(percentage, { timeout: 30000 });
});

When('administrator memasukkan kata kunci {string} pada kolom pencarian', async function (keyword) {
  await this.page.getByPlaceholder('Cari domain atau nama pola...').fill(keyword);
});

// --- Tabel pola terindikasi ---

function patternRows(page) {
  return page.locator('table tbody tr', { has: page.getByRole('link', { name: 'Lihat Detail' }) });
}

Then('tabel pola terindikasi hanya menampilkan domain yang mengandung {string}', async function (keyword) {
  const rows = patternRows(this.page);
  await expect(rows.first()).toBeVisible({ timeout: 30000 });
  for (const text of await rows.allInnerTexts()) {
    if (!text.toLowerCase().includes(keyword.toLowerCase())) {
      throw new Error(`Baris tidak mengandung "${keyword}": ${text}`);
    }
  }
});

Then('tabel pola terindikasi menampilkan tingkat keparahan {string} dan {string}', async function (a, b) {
  for (const severity of [a, b]) {
    await expect(patternRows(this.page).filter({ hasText: severity }).first()).toBeVisible({ timeout: 30000 });
  }
});

Then('tabel pola terindikasi menampilkan tingkat keparahan {string}', async function (severity) {
  await expect(patternRows(this.page).filter({ hasText: severity }).first()).toBeVisible({ timeout: 30000 });
});

Then('tabel pola terindikasi tidak menampilkan tingkat keparahan {string}', async function (severity) {
  await expect(patternRows(this.page).first()).toBeVisible({ timeout: 30000 });
  await expect(patternRows(this.page).filter({ hasText: severity })).toHaveCount(0);
});

When('administrator menekan tombol filter {string}', async function (label) {
  await this.page.getByRole('button', { name: label }).click();
});

When('administrator menekan tombol {string} pada baris domain {string}', async function (button, domain) {
  await patternRows(this.page).filter({ hasText: domain }).getByRole('link', { name: button }).click();
});

// --- Grafik tren ---

When('administrator mengubah filter rentang waktu grafik menjadi {string}', async function (label) {
  // Tunggu data termuat dulu agar klik tidak tertimpa render awal
  await expect(patternRows(this.page).first()).toBeVisible({ timeout: 30000 });
  await this.page.getByRole('button', { name: label, exact: true }).click();
});

// Label bulan pada sumbu-x grafik (teks SVG dengan y=215)
async function chartMonths(page) {
  return page.locator('svg text[y="215"]').allTextContents();
}

Then('keterangan rentang waktu grafik berubah menjadi {string}', async function (label) {
  await expect(this.page.getByText(`(${label})`)).toBeVisible();
});

Then('grafik tren indikasi hanya menampilkan bulan berjalan dengan nilai {int}', async function (value) {
  await expect.poll(() => chartMonths(this.page)).toEqual([MONTHS[new Date().getMonth()]]);
  await expect(this.page.locator('svg text[font-family], svg text.fill-white').first()).toHaveText(String(value));
});

Then('grafik tren indikasi menampilkan 6 bulan terakhir yang diakhiri bulan berjalan', async function () {
  const now = new Date();
  const expected = Array.from({ length: 6 }, (_, i) => MONTHS[new Date(now.getFullYear(), now.getMonth() - 5 + i, 1).getMonth()]);
  await expect.poll(() => chartMonths(this.page)).toEqual(expected);
});

Then('keterangan rentang waktu grafik menampilkan periode 6 bulan terakhir', async function () {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const label = first.getFullYear() === now.getFullYear()
    ? `${MONTHS_FULL[first.getMonth()]} – ${MONTHS_FULL[now.getMonth()]} ${now.getFullYear()}`
    : `${MONTHS_FULL[first.getMonth()]} ${first.getFullYear()} – ${MONTHS_FULL[now.getMonth()]} ${now.getFullYear()}`;
  await expect(this.page.getByText(`(${label})`)).toBeVisible();
});

// --- Detail sinyal ---

Then('skor sinyal anomali menampilkan {string}', async function (score) {
  const card = this.page.locator('div', { has: this.page.getByRole('heading', { name: 'SKOR SINYAL ANOMALI RISK' }) }).last();
  await expect(card.locator('span.text-5xl')).toHaveText(score, { timeout: 30000 });
});

Then('tombol {string} mengarah ke {string} di tab baru', async function (name, href) {
  const link = this.page.getByRole('link', { name });
  await expect(link).toHaveAttribute('href', href, { timeout: 30000 });
  await expect(link).toHaveAttribute('target', '_blank');
});

When('administrator menekan tombol {string}', async function (name) {
  await this.page.getByRole('link', { name }).click({ timeout: 30000 });
});
