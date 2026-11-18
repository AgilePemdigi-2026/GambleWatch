// Step ABO: halaman statis /about dan /kebijakan-privasi (ABO-01, ABO-02).
const assert = require('node:assert/strict');
const { When, Then } = require('@cucumber/cucumber');
require('./support_playwright');

When('pengunjung membuka halaman publik {string}', async function (path) {
  const page = await this.getPage();
  await page.goto(`${this.baseUrl}${path}`, { waitUntil: 'domcontentloaded' });
  await page.locator('h1').first().waitFor({ timeout: 60000 });
});

Then('judul halaman browser adalah {string}', async function (title) {
  const page = await this.getPage();
  assert.equal(await page.title(), title);
});

Then('halaman menampilkan judul utama {string}', async function (heading) {
  const page = await this.getPage();
  assert.equal((await page.locator('h1').first().innerText()).trim(), heading);
});

Then('halaman menampilkan bagian {string}, {string}, dan {string}', async function (a, b, c) {
  const page = await this.getPage();
  const headings = (await page.locator('h2').allInnerTexts()).map((h) => h.trim());
  for (const title of [a, b, c]) {
    assert.ok(headings.includes(title), `bagian "${title}" tidak ada; yang ada: ${JSON.stringify(headings)}`);
  }
});

When('pengunjung memilih tautan footer {string}', async function (label) {
  const page = await this.getPage();
  // Tunggu React aktif agar navigasi <Link> berjalan di sisi klien
  await page.waitForLoadState('load');
  await page.getByRole('navigation', { name: 'Tautan footer' }).getByRole('link', { name: label }).click();
});

Then('alamat halaman publik menjadi {string}', async function (path) {
  const page = await this.getPage();
  await page.waitForURL(`**${path}`, { timeout: 60000 });
  await page.locator('h1').first().waitFor({ timeout: 60000 });
});
