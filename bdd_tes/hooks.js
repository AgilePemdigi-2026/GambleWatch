
const {
  Before,
  After,
  Given,
  When,
  Then
} = require('@cucumber/cucumber');

const { chromium } = require('playwright');
const assert = require('node:assert/strict');

Before(async function () {
  this.browser = await chromium.launch({ headless: true });
  this.page = await this.browser.newPage();
  this.baseURL = process.env.BASE_URL || 'http://localhost:3000';
});

After(async function () {
  if (this.browser) {
    await this.browser.close();
  }
});

// Navigasi umum
Given('I am on the {string} page', async function (path) {
  await this.page.goto(`${this.baseURL}${path}`);
});

When('I press {string}', async function (name) {
  await this.page.getByText(name, { exact: true }).first().click();
});

When('I fill in {string} with {string}', async function (field, value) {
  await this.page.getByPlaceholder(field, { exact: false }).fill(value);
});

When('I leave {string} empty', async function (field) {
  await this.page.getByPlaceholder(field, { exact: false }).fill('');
});

Then('I should be redirected to the {string} page', async function (path) {
  await this.page.waitForURL(`**${path}`);
  assert.ok(this.page.url().includes(path));
});

Then('I should remain on the {string} page', async function (path) {
  assert.ok(this.page.url().includes(path));
});
