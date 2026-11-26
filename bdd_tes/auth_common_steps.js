// Step bersama untuk fitur Landing Page, Sign Up, dan Login (kalimat Gherkin berbahasa Inggris).
//
// Supabase Auth disimulasikan lewat page.route sehingga tes tidak membuat akun sungguhan
// dan tetap jalan walaupun Supabase lokal (Docker) sedang mati.

const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('@playwright/test');

// Akun contoh yang "terdaftar" di simulasi Supabase Auth
const AKUN = {
  'rahmadevi@gmail.com': { password: 'password123', role: undefined },
  'admin@komdigi.go.id': { password: 'password123', role: 'admin' },
};

function fakeUser(email, role, fullName) {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    aud: 'authenticated',
    role: 'authenticated',
    email,
    app_metadata: role ? { provider: 'email', role } : { provider: 'email' },
    user_metadata: fullName ? { full_name: fullName } : {},
    identities: [{ id: '1', provider: 'email' }],
    created_at: new Date().toISOString(),
  };
}

async function simulateSupabaseAuth(world) {
  const page = world.page;
  world.authRequests = [];

  await page.route('**/auth/v1/signup**', async (route) => {
    const body = route.request().postDataJSON() || {};
    world.authRequests.push({ type: 'signup', body });
    // Tanpa session: akun harus dikonfirmasi lewat email terlebih dulu
    return route.fulfill({ status: 200, json: fakeUser(body.email, undefined, body.data?.full_name) });
  });

  await page.route('**/auth/v1/token**', async (route) => {
    const body = route.request().postDataJSON() || {};
    world.authRequests.push({ type: 'login', body });
    const akun = AKUN[body.email];
    if (!akun || akun.password !== body.password) {
      return route.fulfill({
        status: 400,
        json: { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' },
      });
    }
    return route.fulfill({
      status: 200,
      json: {
        access_token: 'bdd-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'bdd-refresh-token',
        user: fakeUser(body.email, akun.role),
      },
    });
  });

  await page.route('**/auth/v1/logout**', (route) => route.fulfill({ status: 204, body: '' }));
}

// Tombol dan tautan dicari berdasarkan nama yang terlihat (mis. "♙ SIGN UP" cocok dengan "SIGN UP")
function clickable(page, name) {
  return page.getByRole('link', { name }).or(page.getByRole('button', { name })).first();
}

Given('the authentication service is simulated', async function () {
  await simulateSupabaseAuth(this);
});

Given('I am on the {string} page', async function (path) {
  // networkidle: tunggu React selesai hydrate, kalau tidak isian form hilang / form submit biasa
  await this.page.goto(`${this.baseUrl}${path}`, { waitUntil: 'networkidle' });
});

Given('I select {string}', async function (tab) {
  await clickable(this.page, tab).click();
  await expect(clickable(this.page, tab)).toBeVisible();
});

When('I press {string}', async function (name) {
  await clickable(this.page, name).click({ timeout: 30000 });
});

When('I fill in {string} with {string}', async function (label, value) {
  await this.page.getByLabel(label, { exact: true }).fill(value);
});

When('I leave {string} empty', async function (label) {
  await this.page.getByLabel(label, { exact: true }).fill('');
});

Then('I should see the {string} section', async function (text) {
  await expect(this.page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 30000 });
});

Then('I should see the {string} button', async function (name) {
  await expect(clickable(this.page, name)).toBeVisible({ timeout: 30000 });
});

Then('I should see the message {string}', async function (text) {
  await expect(this.page.getByText(text, { exact: false }).first()).toBeVisible({ timeout: 30000 });
});

Then('I should be redirected to the {string} page', async function (path) {
  await this.page.waitForURL((url) => url.pathname === path, { timeout: 60000 });
});

Then('I should remain on the {string} page', async function (path) {
  await this.page.waitForTimeout(500);
  expect(new URL(this.page.url()).pathname).toBe(path);
});

// Field `required` kosong: browser menolak submit dan menampilkan pesan validasi bawaan
Then('the browser should show a validation message on {string}', async function (label) {
  const message = await this.page.getByLabel(label, { exact: true })
    .evaluate((el) => el.validationMessage);
  expect(message).not.toBe('');
});

Then('no account data should be sent to the authentication service', function () {
  if (this.authRequests && this.authRequests.length) {
    throw new Error(`Ada permintaan ke Supabase Auth: ${JSON.stringify(this.authRequests)}`);
  }
});

Then('a sign up request for {string} should be sent', function (email) {
  const req = (this.authRequests || []).find((r) => r.type === 'signup');
  if (!req) throw new Error('Tidak ada permintaan sign up ke Supabase Auth');
  expect(req.body.email).toBe(email);
});
