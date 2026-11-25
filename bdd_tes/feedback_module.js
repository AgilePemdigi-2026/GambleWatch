const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

Given('Masyarakat membuka halaman feedback {string}', async function (url) {
  const page = await this.getPage();

  // Simulasikan POST /api/feedback sesuai REQ-7 SRS agar tes konsisten tanpa mengotori DB
  await page.route('**/api/feedback', async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      const body = request.postDataJSON ? request.postDataJSON() : {};
      this.writes.push({ endpoint: '/api/feedback', body });
      return route.fulfill({
        status: 200,
        json: {
          message: 'Terima kasih, masukan Anda berhasil dikirim!',
          data: body,
        },
      });
    }
    return route.continue();
  });

  await page.goto(`${this.baseUrl}${url}`, { waitUntil: 'domcontentloaded' });
  const heading = page.locator('h1', { hasText: 'FEEDBACK' });
  await expect(heading).toBeVisible({ timeout: 30000 });
});

When('Masyarakat mencentang checkbox "Kirim sebagai Anonim"', async function () {
  const page = await this.getPage();
  const checkboxAnonim = page.locator('label:has-text("Kirim sebagai Anonim") input[type="checkbox"]');
  await checkboxAnonim.check();
  await expect(checkboxAnonim).toBeChecked();

  const inputNama = page.locator('#nama_pengirim');
  await expect(inputNama).toBeDisabled();
});

When('Masyarakat mengisi "Nama Lengkap \\(Opsional)" dengan {string}', async function (nama) {
  const page = await this.getPage();
  const inputNama = page.locator('#nama_pengirim');
  await inputNama.fill(nama);
  await expect(inputNama).toHaveValue(nama);
});

When('Masyarakat memilih kategori feedback {string}', async function (kategori) {
  const page = await this.getPage();
  const btnKategori = page.locator(`button:has-text("${kategori}")`);
  await btnKategori.click();
});

When('Masyarakat mengisi "Pesan Masukan" dengan {string}', async function (pesan) {
  const page = await this.getPage();
  const textareaPesan = page.locator('#pesan_masukan');
  await textareaPesan.fill(pesan);
  await expect(textareaPesan).toHaveValue(pesan);
});

When('Masyarakat membiarkan "Pesan Masukan" kosong', async function () {
  const page = await this.getPage();
  const textareaPesan = page.locator('#pesan_masukan');
  await textareaPesan.fill('');
});

When('Masyarakat mengklik tombol "KIRIM FEEDBACK"', async function () {
  const page = await this.getPage();
  const btnSubmit = page.locator('button[type="submit"]:has-text("KIRIM FEEDBACK")');
  await btnSubmit.click();
});

Then('Notifikasi berhasil mengirim feedback harus muncul di layar', async function () {
  const page = await this.getPage();
  const successBanner = page.locator('div.bg-emerald-50');
  await expect(successBanner).toBeVisible({ timeout: 10000 });
  await expect(successBanner).toContainText('Terima kasih');
});

Then('Validasi pesan masukan wajib diisi harus mencegah pengiriman', async function () {
  const page = await this.getPage();
  const textareaPesan = page.locator('#pesan_masukan');
  const isValid = await textareaPesan.evaluate((el) => el.checkValidity());
  expect(isValid).toBe(false);
  expect(this.writes.length).toBe(0);
  expect(page.url()).toContain('/feedback');
});