const { Before, After, BeforeAll, AfterAll } = require('@cucumber/cucumber');
const { chromium } = require('@playwright/test');

let browser;

BeforeAll(async function () {
  // Meluncurkan browser Chromium (headless: false jika ingin melihat browser terbuka)
  browser = await chromium.launch({ headless: false });
});

AfterAll(async function () {
  if (browser) {
    await browser.close();
  }
});

Before(async function () {
  // Menyiapkan context dan page baru untuk setiap skenario
  this.context = await browser.newContext();
  this.page = await this.context.newPage();
});

After(async function () {
  // Membersihkan halaman setelah skenario selesai
  if (this.page) {
    await this.page.close();
  }
  if (this.context) {
    await this.context.close();
  }
});