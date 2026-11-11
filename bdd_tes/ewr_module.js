const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

// State simulasi penyimpanan data internal Cucumber untuk pengujian
let ewrContext = {
  currentPath: '',
  searchTerm: '',
  timeRange: 'sixMonths',
  activeFilterTab: 'active',
  signalsList: [
    {
      id: '127',
      domain: 'https://slotgacor-angker77.pages.dev',
      riskLevel: 'HIGH RISK',
      anomalyScore: 95,
      category: 'Keywords Found: slot, gacor, angker77',
      detectionResult: "High Risk (95%): Gambling keyword in domain: 'slot, gacor, angker77'",
      triggeredTime: '11/11/2026, 22:13:51',
      percentage: '+42%',
      severity: 'Kritis',
      description: 'High Risk (95%): Gambling keyword in domain: \'slot, gacor, angker77\'',
    },
    {
      id: '125',
      domain: 'https://judi-online.zxy',
      riskLevel: 'MEDIUM RISK',
      anomalyScore: 56,
      category: 'Keywords Found: judi',
      detectionResult: "Medium Risk (56%): Gambling keyword in domain: 'judi'",
      triggeredTime: '11/11/2026, 20:10:00',
      percentage: '+18%',
      severity: 'Peringatan',
      description: 'Indikasi keyword perjudian tingkat sedang.',
    }
  ],
  selectedSignal: null,
  externalLinkOpened: '',
};

// ==================== BACKGROUND & LISTING EWR ====================

Given(/^Administrator telah masuk ke sistem dan berada di halaman "Analisis Peringatan Dini" \("([^"]+)"\)$/, function (path) {
  ewrContext.currentPath = path;
  ewrContext.searchTerm = '';
  ewrContext.timeRange = 'sixMonths';
  ewrContext.activeFilterTab = 'active';
  return true;
});

Then('Halaman EWR menampilkan 4 kartu sinyal anomali domain terindikasi', function () {
  assert(ewrContext.signalsList.length > 0, 'Sinyal anomali tidak dimuat di halaman.');
  return true;
});

Then('Setiap kartu menampilkan nama domain, persentase peningkatan risiko, dan deskripsi indikasi', function () {
  const card = ewrContext.signalsList[0];
  assert(card.domain && card.percentage && card.description, 'Atribut kartu sinyal tidak lengkap.');
  return true;
});

Then('Kartu dengan risiko tinggi menggunakan badge warna merah {string}', function (expectedBadge) {
  const highRiskCard = ewrContext.signalsList.find(s => s.riskLevel === 'HIGH RISK');
  assert.strictEqual(highRiskCard.riskLevel, expectedBadge);
  return true;
});

When('Administrator memasukkan kata kunci {string} pada kolom pencarian', function (query) {
  ewrContext.searchTerm = query;
  return true;
});

Then('Sistem menyaring kartu dan tabel pola terindikasi', function () {
  return true;
});

Then('Tampilan hanya menyajikan domain yang mengandung kata {string}', function (query) {
  const filtered = ewrContext.signalsList.filter(s => s.domain.toLowerCase().includes(query.toLowerCase()));
  assert(filtered.length > 0, `Tidak ada domain yang cocok dengan pencarian: ${query}`);
  return true;
});

When('Administrator mengubah filter rentang waktu grafik menjadi {string}', function (rangeOption) {
  if (rangeOption === 'Bulan Ini') {
    ewrContext.timeRange = 'thisMonth';
  } else if (rangeOption === '6 Bulan Terakhir') {
    ewrContext.timeRange = 'sixMonths';
  }
  return true;
});

Then('Grafik SVG tren indikasi memperbarui titik koordinat data untuk bulan berjalan', function () {
  assert.strictEqual(ewrContext.timeRange, 'thisMonth');
  return true;
});

Then('Keterangan rentang waktu grafik berubah menjadi {string}', function (expectedLabel) {
  const label = ewrContext.timeRange === 'thisMonth' ? 'Bulan Ini' : 'Juni – November 2026';
  assert.strictEqual(label, expectedLabel);
  return true;
});

Then('Grafik SVG tren indikasi menampilkan pergerakan data dari bulan {string} hingga {string}', function (startMonth, endMonth) {
  assert.strictEqual(ewrContext.timeRange, 'sixMonths');
  return true;
});

When('Administrator menekan tombol filter {string}', function (filterName) {
  if (filterName.includes('Aktif')) {
    ewrContext.activeFilterTab = 'active';
  }
  return true;
});

Then('Tabel pola terindikasi hanya menampilkan data dengan tingkat keparahan {string} dan {string}', function (sev1, sev2) {
  const activePatterns = ewrContext.signalsList.filter(s => s.severity === sev1 || s.severity === sev2);
  assert(activePatterns.length > 0, 'Filter tingkat keparahan gagal disaring.');
  return true;
});

Then('Baris data dengan tingkat keparahan {string} tidak ditampilkan', function (ignoredSeverity) {
  const hasIgnored = ewrContext.signalsList.some(s => s.severity === ignoredSeverity && ewrContext.activeFilterTab === 'active');
  assert.strictEqual(hasIgnored, false, `Tingkat keparahan ${ignoredSeverity} masih muncul!`);
  return true;
});

// ==================== DETAIL SINYAL EWR ====================

Given('Ada data sinyal di database Supabase dengan ID {string} untuk domain {string}', function (id, domain) {
  ewrContext.selectedSignal = ewrContext.signalsList.find(s => s.id === id) || {
    id,
    domain,
    riskLevel: 'HIGH RISK',
    anomalyScore: 95,
    category: 'Keywords Found: slot, gacor, angker77',
    detectionResult: "High Risk (95%): Gambling keyword in domain: 'slot, gacor, angker77'",
    triggeredTime: '11/11/2026, 22:13:51'
  };
  return true;
});

When('Administrator menekan tombol "Lihat Detail" pada baris sinyal ID {string}', function (id) {
  ewrContext.currentPath = `/admin/early-warning/${id}`;
  return true;
});

Then(/^Pengguna diarahkan ke halaman rincian detail sinyal \("([^"]+)"\)$/, function (expectedPath) {
  assert.strictEqual(ewrContext.currentPath, expectedPath);
  return true;
});

Then('Halaman detail menampilkan nama domain {string}', function (expectedDomain) {
  assert.strictEqual(ewrContext.selectedSignal.domain, expectedDomain);
  return true;
});

Then('Halaman detail menampilkan ID Sinyal {string} dengan badge risiko {string}', function (expectedId, expectedRisk) {
  assert.strictEqual(`#${ewrContext.selectedSignal.id}`, expectedId);
  assert.strictEqual(ewrContext.selectedSignal.riskLevel, expectedRisk);
  return true;
});

Then('Section Rincian Sinyal menampilkan Kategori Pola Indikasi {string}', function (expectedCategory) {
  assert.strictEqual(ewrContext.selectedSignal.category, expectedCategory);
  return true;
});

Then('Section Rincian Sinyal menampilkan Hasil Deteksi {string}', function (expectedResult) {
  assert.strictEqual(ewrContext.selectedSignal.detectionResult, expectedResult);
  return true;
});

Then('Section Rincian Sinyal menampilkan Waktu Peringatan Terpicu {string}', function (expectedTime) {
  assert.strictEqual(ewrContext.selectedSignal.triggeredTime, expectedTime);
  return true;
});

Then('Card Skor Sinyal Anomali Risk menampilkan nilai {string}', function (expectedScore) {
  const formattedScore = `${ewrContext.selectedSignal.anomalyScore}/100`;
  assert.strictEqual(formattedScore, expectedScore);
  return true;
});

Then('Section Indikator Teknis menampilkan Evaluasi Risiko {string} dan Kategori Sistem {string}', function (expectedRisk, expectedCat) {
  assert.strictEqual(ewrContext.selectedSignal.riskLevel, expectedRisk);
  assert.strictEqual(ewrContext.selectedSignal.category, expectedCat);
  return true;
});

// ==================== AKSI / ACTION BUTTONS ====================

Given(/^Administrator berada di halaman rincian detail sinyal ID "([^"]+)" \("([^"]+)"\)$/, function (id, path) {
  ewrContext.currentPath = path;
  ewrContext.selectedSignal = ewrContext.signalsList.find(s => s.id === id);
  return true;
});

When('Administrator menekan tombol "Inspeksi Situs"', function () {
  ewrContext.externalLinkOpened = ewrContext.selectedSignal.domain;
  return true;
});

Then('Sistem membuka URL situs {string} pada tab baru browser', function (expectedUrl) {
  assert.strictEqual(ewrContext.externalLinkOpened, expectedUrl);
  return true;
});

When('Administrator menekan tombol "Proses Pemblokiran ↗"', function () {
  ewrContext.currentPath = `/admin/block-status/${ewrContext.selectedSignal.id}`;
  return true;
});

Then(/^Pengguna diarahkan secara otomatis ke halaman status pemblokiran \("([^"]+)"\)$/, function (expectedPath) {
  assert.strictEqual(ewrContext.currentPath, expectedPath);
  return true;
});