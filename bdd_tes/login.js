
const { Then } = require('@cucumber/cucumber');
const assert = require('node:assert/strict');

Then('I should be logged in successfully', async function () {
  await this.page.waitForURL(
    url => !url.pathname.includes('/sign-in'),
    { timeout: 10000 }
  );

  assert.ok(!this.page.url().includes('/sign-in'));
});

Then('I should see an invalid credentials message', async function () {
  const message = this.page.getByText(
    /email|password|salah|tidak valid|gagal/i
  ).first();

  await message.waitFor({ state: 'visible', timeout: 10000 });
  assert.ok(await message.isVisible());
});
