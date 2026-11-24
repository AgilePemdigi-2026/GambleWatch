const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

Given('Pengguna berada di halaman utama GambleWatch untuk melihat kebijakan privasi', async function () {
  await this.page.goto('http://localhost:3000');
});

When('Pengguna mengklik tautan Privacy Policy pada footer', async function () {
  await this.page.locator('footer').getByRole('link', { name: 'Privacy Policy' }).click();
});

Then('Pengguna diarahkan ke halaman Kebijakan Privasi {string}', async function (expectedPath) {
  await expect(this.page).toHaveURL(new RegExp(`${expectedPath}$`));
});

Then('Halaman Kebijakan Privasi menampilkan judul {string}', async function (headingText) {
  await expect(this.page.locator('h1')).toContainText(headingText);
});

Then('Halaman Kebijakan Privasi menampilkan identitas {string}', async function (platformText) {
  await expect(this.page.locator('main')).toContainText(platformText);
});

Then('Halaman Kebijakan Privasi menampilkan subbagian {string}', async function (subHeadingText) {
  const subHeading = this.page.locator('h2', { hasText: subHeadingText });
  await expect(subHeading).toBeVisible();
});