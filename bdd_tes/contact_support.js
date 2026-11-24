const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

Given('Pengguna berada di halaman utama GambleWatch untuk melihat kontak bantuan', async function () {
  await this.page.goto('http://localhost:3000');
});

When('Pengguna mengklik tautan Contact Support pada footer', async function () {
  await this.page.locator('footer').getByRole('link', { name: 'Contact Support' }).click();
});

Then('Pengguna diarahkan ke halaman Contact Support {string}', async function (expectedPath) {
  await expect(this.page).toHaveURL(new RegExp(`${expectedPath}$`));
});

Then('Halaman Contact Support menampilkan judul {string}', async function (headingText) {
  await expect(this.page.locator('h1')).toContainText(headingText);
});

Then('Halaman Contact Support menampilkan instansi {string}', async function (instansiText) {
  await expect(this.page.locator('main')).toContainText(instansiText);
});

Then('Halaman Contact Support menampilkan email {string}', async function (emailText) {
  await expect(this.page.locator('main')).toContainText(emailText);
});

Then('Halaman Contact Support menampilkan nomor layanan {string} dan {string}', async function (nomor1, nomor2) {
  const mainContent = this.page.locator('main');
  await expect(mainContent).toContainText(nomor1);
  await expect(mainContent).toContainText(nomor2);
});

Then('Halaman Contact Support menampilkan call center {string}', async function (callCenterText) {
  await expect(this.page.locator('main')).toContainText(callCenterText);
});