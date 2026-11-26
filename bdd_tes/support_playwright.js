// Dukungan bersama BDD (Cucumber + Playwright) untuk modul sprint 3.
//
// Menjalankan:   npm run test:bdd
// Prasyarat:     web Next.js di http://localhost:3000 (npm run dev) dan, untuk modul DET,
//                API deteksi di http://127.0.0.1:8001
//                (python -m uvicorn detection_engine.api.main:app --port 8001).
//                Skenario OCR (anl_module) butuh Tesseract OCR terpasang di mesin API deteksi
//                (Windows: winget install UB-Mannheim.TesseractOCR, plus paket bahasa "ind").
// Variabel opsional: BASE_URL, DETECTION_API_URL, HEADED=1 (tampilkan browser).
//
// Halaman admin diuji dengan respons Supabase yang DISIMULASIKAN (page.route), sehingga
// hasilnya selalu sama dan tes tidak pernah menulis ke database tim.

const {
  BeforeAll, AfterAll, Before, After, setDefaultTimeout, setWorldConstructor, World,
} = require('@cucumber/cucumber');
const { chromium } = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.DETECTION_API_URL || 'http://127.0.0.1:8001';

setDefaultTimeout(90 * 1000);

let browser;

BeforeAll(async function () {
  browser = await chromium.launch({ headless: process.env.HEADED !== '1' });
});

AfterAll(async function () {
  if (browser) await browser.close();
});

class GambleWatchWorld extends World {
  constructor(options) {
    super(options);
    this.baseUrl = BASE_URL;
    this.apiUrl = API_URL;
    this.writes = []; // permintaan tulis ke Supabase yang tertangkap
  }

  // Membuat context + halaman sekali per skenario (dipanggil di hook Before).
  async getPage() {
    if (!this.page) {
      this.context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        locale: 'id-ID',
        timezoneId: 'Asia/Jakarta',
      });
      this.page = await this.context.newPage();
    }
    return this.page;
  }
}

setWorldConstructor(GambleWatchWorld);

// Halaman disiapkan di awal setiap skenario agar step yang memakai `this.page`
// langsung (contact support, kebijakan privasi, landing page, dll.) bisa jalan.
Before(async function () {
  this.writes = [];
  await this.getPage();
});

After(async function () {
  if (this.context) await this.context.close();
});

// --- Data laporan_analisis untuk simulasi ---

const HOUR = 60 * 60 * 1000;

// "1 jam lalu", "3 hari lalu", "2 bulan lalu" -> ISO 8601
function relativeTime(text) {
  const match = /^(\d+)\s+(jam|hari|bulan)\s+lalu$/.exec((text || '').trim());
  if (!match) return new Date().toISOString();
  const n = Number(match[1]);
  const d = new Date();
  if (match[2] === 'jam') d.setTime(d.getTime() - n * HOUR);
  if (match[2] === 'hari') d.setTime(d.getTime() - n * 24 * HOUR);
  if (match[2] === 'bulan') d.setMonth(d.getMonth() - n);
  return d.toISOString();
}

// Satu baris tabel Gherkin -> baris laporan_analisis.
// Kolom tabel: id, url, risiko, skor, status, waktu, pelapor, catatan, temuan
// "temuan" berbentuk "modul: a, b" (mis. "keyword_analysis: slot gacor, maxwin").
function buildLaporan(row, index) {
  const risiko = row.risiko || 'PENDING';
  const skor = row.skor === undefined || row.skor === '' ? 0 : Number(row.skor);
  let bukti = null;
  if (row.temuan) {
    // pisah pada titik dua pertama saja: temuan sendiri bisa berisi titik dua
    const cut = row.temuan.indexOf(':');
    const modulName = row.temuan.slice(0, cut);
    const list = row.temuan.slice(cut + 1);
    const modul = {};
    for (const key of ['url_pattern', 'visual_similarity', 'ocr', 'keyword_analysis']) {
      modul[key] = { status: 'skipped', label: 'Skipped', skor: 0, temuan: [] };
    }
    modul[modulName.trim()] = {
      status: 'ok', label: 'Terdeteksi', skor,
      temuan: list.split(',').map((t) => t.trim()).filter(Boolean),
    };
    bukti = {
      versi: 1, request_id: `bdd-${index}`, dianalisis_pada: relativeTime(row.waktu),
      skor, indikasi: risiko === 'HIGH' ? 'Tinggi' : risiko === 'MEDIUM' ? 'Sedang' : 'Rendah',
      waktu_proses_ms: 10, modul, potongan_teks: [], teks_ocr: null,
    };
  }
  return {
    id: Number(row.id || 900000 + index),
    user_id: row.pelapor || null,
    url_situs: row.url || '-',
    tingkat_risiko: risiko,
    skor_probabilitas: skor,
    status: row.status || 'DRAFT',
    created_at: relativeTime(row.waktu),
    catatan_admin: row.catatan || null,
    url_pattern_analysis: null,
    visual_similarity: null,
    ocr_flagged: false,
    keywords_found: null,
    bukti_screenshot: null,
    bukti_deteksi: bukti,
  };
}

// Simulasikan tabel Supabase `table` dengan isi `rows` di halaman ini.
// GET: daftar (dengan header content-range) atau satu baris bila ada "id=eq.X".
// POST/PATCH/DELETE: dicatat di world.writes lalu dijawab seolah berhasil.
async function mockSupabaseTable(world, table, rows) {
  const page = await world.getPage();
  await page.route(`**/rest/v1/${table}**`, async (route) => {
    const request = route.request();
    const method = request.method();
    const idMatch = /[?&]id=eq\.(\d+)/.exec(request.url());
    if (method !== 'GET') {
      const body = request.postDataJSON ? request.postDataJSON() : null;
      const data = Array.isArray(body) ? body[0] : body;
      // PATCH/DELETE dengan id=eq.X mengubah/menghapus baris itu; selain itu baris baru
      const target = idMatch ? rows.find((r) => String(r.id) === idMatch[1]) : null;
      let saved;
      if (method === 'PATCH' && target) saved = Object.assign(target, data);
      else if (method === 'DELETE' && target) saved = rows.splice(rows.indexOf(target), 1)[0];
      else saved = { id: 999001, ...data };
      world.writes.push({ table, method, id: idMatch ? Number(idMatch[1]) : null, body: data ?? saved });
      if (method === 'POST') rows.push(saved);
      const wantsObject = (request.headers().accept || '').includes('vnd.pgrst.object');
      return route.fulfill({ status: 201, json: wantsObject ? saved : [saved] });
    }
    if (idMatch) {
      const found = rows.find((r) => String(r.id) === idMatch[1]);
      return found
        ? route.fulfill({ status: 200, json: found })
        : route.fulfill({ status: 406, json: { message: 'not found' } });
    }
    return route.fulfill({
      status: 200,
      headers: { 'content-range': `0-${Math.max(rows.length - 1, 0)}/${rows.length}` },
      json: rows,
    });
  });
}

// Tunggu sampai teks terlihat (halaman Next.js dev bisa lambat saat pertama dikompilasi)
async function expectText(page, text) {
  await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 60000 });
}

// Teks halaman dengan spasi dirapikan, untuk mencocokkan kalimat yang terpotong elemen
async function pageText(page) {
  return (await page.locator('body').innerText()).replace(/\s+/g, ' ');
}

// --- Step bersama (dipakai modul TLJ dan ANL integrasi) ---

const { When: WhenStep, Then: ThenStep } = require('@cucumber/cucumber');

WhenStep('admin membuka halaman {string}', async function (path) {
  const page = await this.getPage();
  await page.goto(`${this.baseUrl}${path}`, { waitUntil: 'domcontentloaded' });
});

ThenStep('halaman menampilkan teks {string}', async function (text) {
  await expectText(await this.getPage(), text);
});

ThenStep('halaman tidak menampilkan teks {string}', async function (text) {
  const page = await this.getPage();
  const body = await pageText(page);
  if (body.includes(text)) throw new Error(`Teks "${text}" seharusnya tidak tampil`);
});

ThenStep('tidak ada data yang ditulis ke Supabase', function () {
  if (this.writes.length) throw new Error(`Ada penulisan: ${JSON.stringify(this.writes)}`);
});

// Laporan disimpan di SERVER oleh route /api/analyze, jadi simulasi Supabase di browser tidak
// bisa mencegatnya. Permintaan form ke /api/analyze diteruskan dengan header dry-run: route
// menjalankan mesin deteksi asli tetapi tidak menulis ke Supabase, lalu mengembalikan baris yang
// AKAN disimpan. Baris itu dicatat di world.writes (table "laporan_analisis (server)") dan
// dimasukkan ke `rows` agar halaman hasil bisa membacanya lewat mockSupabaseTable.
async function simulateLaporanServer(world, rows) {
  const page = await world.getPage();
  await page.route('**/api/analyze', async (route) => {
    const request = route.request();
    const response = await route.fetch({
      headers: { ...request.headers(), 'x-gamblewatch-dry-run': '1' },
      timeout: 110 * 1000,
    });
    const body = await response.json().catch(() => ({}));
    if (body.success && body.laporan) {
      const row = { ...body.laporan, id: body.id };
      rows.push(row);
      world.writes.push({ table: 'laporan_analisis (server)', method: 'POST', body: row });
    }
    return route.fulfill({ response, json: body });
  });
}

module.exports = { buildLaporan, mockSupabaseTable, simulateLaporanServer, relativeTime, expectText, pageText };
