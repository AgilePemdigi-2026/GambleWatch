// Step MON (F11): halaman /admin/scraping membaca tabel scrape_jobs (+ scrape_results).
// Supabase disimulasikan lewat page.route: filter PostgREST (eq, ilike, gte, not.is.null),
// hitungan (HEAD + content-range), dan penambahan job. Tidak ada data yang ditulis ke database.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { Given, When, Then } = require('@cucumber/cucumber');
const { expectText } = require('./support_playwright');

const TIMEOUT = { timeout: 90 * 1000 };
const MINUTE = 60 * 1000;

function projectRef() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  for (const name of ['.env.local', '.env']) {
    if (url) break;
    const file = path.join(process.cwd(), name);
    if (fs.existsSync(file)) {
      const match = fs.readFileSync(file, 'utf8').match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*["']?([^"'\r\n]+)/m);
      if (match) url = match[1].trim();
    }
  }
  try { return new URL(url).hostname.split('.')[0]; } catch { return 'placeholder'; }
}

// Satu baris tabel Gherkin -> baris scrape_jobs dengan hasil (scrape_results) bila selesai
function buildJob(row, index) {
  const now = Date.now();
  const finished = row.selesai ? new Date(now - parseInt(row.selesai, 10) * MINUTE).toISOString() : null;
  const temuan = Number(row.temuan || 0);
  const done = row.status === 'SUCCESS' || row.status === 'BLOCKED';
  return {
    id: 500 + index,
    url: row.url.trim(),
    source: 'manual',
    status: row.status,
    failure_code: row.gagal || null,
    failure_message: null,
    attempts: 1,
    created_at: new Date(now - (60 - index) * MINUTE).toISOString(),
    finished_at: finished,
    scrape_results: done ? [{
      final_url: row.url.trim(), http_status: 200, title: 'Halaman uji',
      indication: temuan ? 'Tinggi' : 'Rendah', overall_score: temuan ? 0.9 : 0.1,
      modules: { keyword_analysis: { score: temuan ? 0.9 : 0, label: 'uji', findings: Array.from({ length: temuan }, (_, i) => `kata${i}`) } },
      scraped_at: finished,
    }] : [],
  };
}

// Terapkan filter PostgREST sederhana yang dipakai halaman monitoring
function applyFilters(rows, params) {
  let out = [...rows];
  for (const [key, raw] of params.entries()) {
    if (['select', 'order', 'limit', 'offset'].includes(key)) continue;
    const value = decodeURIComponent(raw);
    if (value.startsWith('eq.')) out = out.filter((r) => String(r[key]) === value.slice(3));
    else if (value.startsWith('ilike.')) {
      const needle = value.slice(6).replace(/[*%]/g, '').toLowerCase();
      out = out.filter((r) => String(r[key] ?? '').toLowerCase().includes(needle));
    } else if (value.startsWith('gte.')) out = out.filter((r) => r[key] && r[key] >= value.slice(4));
    else if (value === 'not.is.null') out = out.filter((r) => r[key] !== null);
  }
  const order = params.get('order');
  if (order) {
    const [col, dir] = order.split('.');
    out.sort((a, b) => String(a[col] ?? '').localeCompare(String(b[col] ?? '')) * (dir === 'desc' ? -1 : 1));
  }
  return out;
}

async function mockScrapeJobs(world) {
  const page = await world.getPage();
  await page.route('**/rest/v1/scrape_jobs**', async (route) => {
    const request = route.request();
    const method = request.method();
    if (world.scrapeTableMissing) {
      return route.fulfill({ status: 404, json: { code: 'PGRST205', message: "Could not find the table 'public.scrape_jobs'" } });
    }
    if (method === 'POST') {
      const body = request.postDataJSON();
      const saved = { id: 999, status: 'PENDING', attempts: 0, ...(Array.isArray(body) ? body[0] : body) };
      world.writes.push({ table: 'scrape_jobs', method, body: saved });
      return route.fulfill({ status: 201, json: [saved] });
    }
    if (method !== 'GET' && method !== 'HEAD') {
      world.writes.push({ table: 'scrape_jobs', method });
      return route.fulfill({ status: 204, body: '' });
    }
    const params = new URL(request.url()).searchParams;
    const all = applyFilters(world.scrapeJobs, params);
    const offset = Number(params.get('offset') || 0);
    const limit = params.has('limit') ? Number(params.get('limit')) : all.length;
    const pageRows = all.slice(offset, offset + limit);
    const range = pageRows.length ? `${offset}-${offset + pageRows.length - 1}/${all.length}` : `*/${all.length}`;
    // Supabase lintas-origin: browser hanya membaca Content-Range bila header ini diekspos
    const headers = {
      'content-range': range,
      'access-control-allow-origin': '*',
      'access-control-expose-headers': 'Content-Range',
    };
    if (method === 'HEAD') return route.fulfill({ status: 200, headers, body: '' });
    return route.fulfill({ status: 200, headers, json: pageRows });
  });
}

Given('data scraping berikut tersedia:', async function (table) {
  this.scrapeJobs = table.hashes().map(buildJob);
  this.scrapeTableMissing = false;
  await mockScrapeJobs(this);
});

Given('tabel scraping belum dibuat', function () {
  this.scrapeTableMissing = true;
});

Given('admin sudah masuk', async function () {
  const page = await this.getPage();
  const user = { id: 'admin-uji', email: 'admin@uji.test', role: 'authenticated', app_metadata: { role: 'admin' } };
  const session = {
    access_token: 'token-uji', refresh_token: 'refresh-uji', token_type: 'bearer',
    expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user,
  };
  await page.context().addCookies([{
    name: `sb-${projectRef()}-auth-token`,
    value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'),
    domain: 'localhost', path: '/',
  }]);
  await page.route('**/auth/v1/user*', (route) => route.fulfill({ status: 200, json: user }));
});

When('admin membuka halaman monitoring scraping', TIMEOUT, async function () {
  const page = await this.getPage();
  await page.goto(`${this.baseUrl}/admin/scraping`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: 'Web Scraping Monitor' }).waitFor({ timeout: 60000 });
  // Tunggu React aktif dan data pertama selesai dimuat
  await page.getByText(/Memuat data scraping/).waitFor({ state: 'detached', timeout: 60000 }).catch(() => {});
});

async function cardValue(page, title) {
  const card = page.locator('section[aria-label="Ringkasan scraping"] > div').filter({ hasText: title });
  return (await card.locator('p').nth(1).innerText()).replace(/\s+/g, ' ').trim();
}

Then('kartu {string} menampilkan {string}', TIMEOUT, async function (title, value) {
  const page = await this.getPage();
  await page.waitForFunction(
    ([t, v]) => [...document.querySelectorAll('section[aria-label="Ringkasan scraping"] > div')]
      .some((c) => c.textContent.includes(t) && c.querySelectorAll('p')[1]?.textContent.trim().startsWith(v)),
    [title, value], { timeout: 30000 },
  ).catch(() => {});
  assert.ok((await cardValue(page, title)).startsWith(value), `kartu ${title}: ${await cardValue(page, title)}`);
});

Then('baris {string} berstatus {string} dengan data {string}', async function (url, status, data) {
  const page = await this.getPage();
  const row = page.locator('tbody tr').filter({ hasText: url });
  await row.waitFor({ timeout: 30000 });
  const text = (await row.innerText()).replace(/\s+/g, ' ');
  assert.ok(text.includes(status), `status baris ${url}: ${text}`);
  assert.ok(text.includes(data), `data baris ${url}: ${text}`);
});

When('admin memilih filter status {string}', async function (label) {
  const page = await this.getPage();
  await page.getByLabel('Filter status').selectOption({ label });
});

Then('tabel hanya menampilkan {string}', TIMEOUT, async function (url) {
  const page = await this.getPage();
  await page.waitForFunction(
    (u) => {
      const rows = [...document.querySelectorAll('tbody tr')];
      return rows.length === 1 && rows[0].textContent.includes(u);
    }, url, { timeout: 30000 },
  );
});

When('admin menjalankan scan baru untuk {string}', async function (url) {
  const page = await this.getPage();
  await page.getByRole('button', { name: 'Jalankan Scan Baru' }).click();
  await page.getByLabel('Link situs').fill(url);
  await page.getByRole('button', { name: 'Tambahkan ke Antrean' }).click();
});

When('pengguna menekan tombol {string}', async function (name) {
  const page = await this.getPage();
  await page.getByRole('button', { name }).click();
});

Then('job scan {string} ditambahkan dengan sumber {string}', TIMEOUT, async function (url, source) {
  const page = await this.getPage();
  await expectText(page, 'Scan ditambahkan ke antrean');
  const write = this.writes.find((w) => w.table === 'scrape_jobs' && w.method === 'POST');
  assert.ok(write, 'job tidak ditambahkan');
  assert.equal(write.body.url, url);
  assert.equal(write.body.source, source);
});
