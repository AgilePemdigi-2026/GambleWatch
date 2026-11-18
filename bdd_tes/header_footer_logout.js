const fs = require('node:fs');
const path = require('node:path');
const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

function getSupabaseProjectRef() {
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!supabaseUrl) {
    for (const envFile of ['.env.local', '.env']) {
      const fullPath = path.join(process.cwd(), envFile);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const match = content.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
        if (match) {
          supabaseUrl = match[1].trim();
          break;
        }
      }
    }
  }
  try {
    return new URL(supabaseUrl).hostname.split('.')[0];
  } catch {
    return 'placeholder';
  }
}

Given('pengguna mengunjungi halaman publik {string}', async function (targetPath) {
  const page = await this.getPage();
  await page.goto(`${this.baseUrl}${targetPath}`, { waitUntil: 'domcontentloaded' });
});

Then('header publik menampilkan menu {string}, {string}, dan {string}', async function (m1, m2, m3) {
  const page = await this.getPage();
  const header = page.locator('header');
  await expect(header.getByRole('link', { name: m1 })).toBeVisible({ timeout: 10000 });
  await expect(header.getByRole('link', { name: m2 })).toBeVisible({ timeout: 10000 });
  await expect(header.getByRole('link', { name: m3 })).toBeVisible({ timeout: 10000 });
});

Then('footer publik menampilkan tautan {string}, {string}, dan {string}', async function (f1, f2, f3) {
  const page = await this.getPage();
  const footer = page.locator('footer');
  await expect(footer.getByRole('link', { name: f1 })).toBeVisible({ timeout: 10000 });
  await expect(footer.getByRole('link', { name: f2 })).toBeVisible({ timeout: 10000 });
  await expect(footer.getByRole('link', { name: f3 })).toBeVisible({ timeout: 10000 });
});

Given('admin menyiapkan simulasi sesi keluar', async function () {
  const page = await this.getPage();
  await page.route('**/auth/v1/logout*', (route) => route.fulfill({ status: 204, body: '' }));
});

Then('header admin menampilkan menu {string}, {string}, dan {string}', async function (m1, m2, m3) {
  const page = await this.getPage();
  const header = page.locator('header');
  await expect(header.getByRole('link', { name: m1 })).toBeVisible({ timeout: 10000 });
  await expect(header.getByRole('link', { name: m2 })).toBeVisible({ timeout: 10000 });
  await expect(header.getByRole('link', { name: m3 })).toBeVisible({ timeout: 10000 });
});

Then('header admin menampilkan tombol {string}', async function (btnText) {
  const page = await this.getPage();
  const btn = page.locator('header').getByRole('button', { name: btnText });
  await expect(btn).toBeVisible({ timeout: 10000 });
});

When('admin menekan tombol {string} pada header', async function (btnText) {
  const page = await this.getPage();
  await page.locator('header').getByRole('button', { name: btnText }).click();
});

Given('pengguna memiliki sesi login aktif di browser', async function () {
  const page = await this.getPage();
  const projectRef = getSupabaseProjectRef();

  const fakeSession = JSON.stringify({
    access_token: 'fake-access-token',
    refresh_token: 'fake-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: { id: 'user-test-123', email: 'warga@test.com', role: 'authenticated' },
  });

  const encodedSession = 'base64-' + Buffer.from(fakeSession).toString('base64url');

  await this.context.addCookies([
    {
      name: `sb-${projectRef}-auth-token`,
      value: encodedSession,
      domain: 'localhost',
      path: '/',
    },
  ]);

  await page.route('**/auth/v1/user*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'user-test-123', email: 'warga@test.com', role: 'authenticated' }),
    })
  );
  await page.route('**/auth/v1/logout*', (route) => route.fulfill({ status: 204, body: '' }));
});

Then('header publik menampilkan tombol {string}', async function (btnText) {
  const page = await this.getPage();
  const btn = page.locator('header').getByRole('button', { name: new RegExp(btnText, 'i') });
  await expect(btn).toBeVisible({ timeout: 10000 });
});

When('pengguna menekan tombol {string} pada header publik', async function (btnText) {
  const page = await this.getPage();
  await page.locator('header').getByRole('button', { name: new RegExp(btnText, 'i') }).click();
});

Then('sesi berakhir dan diarahkan ke {string}', async function (targetPath) {
  const page = await this.getPage();
  await page.waitForURL(`**${targetPath}`, { timeout: 15000, waitUntil: 'domcontentloaded' });
  expect(page.url()).toContain(targetPath);
});