
const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');

Given('I am on the website', async function () {
  await this.page.goto(this.baseURL);
});

When('I access the website', async function () {
  await this.page.goto(`${this.baseURL}/landing-page`);
});

Then('I should see the {string} page', async function (path) {
  await this.page.waitForURL(`**${path}`);
  assert.ok(this.page.url().includes(path));
});

Then('I should see the {string} section', async function (text) {
  const element = this.page.getByText(text, { exact: false }).first();
  assert.ok(await element.isVisible());
});

Then('I should see the {string} button', async function (name) {
  const button = this.page.getByText(name, { exact: true }).first();
  assert.ok(await button.isVisible());
});

When('I press {string}', async function (name) {
  await this.page.getByText(name, { exact: true }).first().click();
});

Then('I should be redirected to the {string} page', async function (path) {
  await this.page.waitForURL(`**${path}`);
  assert.ok(this.page.url().includes(path));
});
