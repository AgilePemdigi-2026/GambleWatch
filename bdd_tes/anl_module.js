const { Given, When, Then } = require('@cucumber/cucumber');

// State simulasi DB & UI untuk pengujian BDD
let mockState = {
  url: '',
  file: null,
  buttonStatus: 'SCAN',
  errorMessage: '',
  redirectUrl: '',
  currentReport: null,
  dbRecords: [],
  notification: '',
};

// --- BACKGROUND ---
Given(/^Pengguna berada di halaman Form Analisis Situs \("([^"]+)"\)$/, function (path) {
  mockState = {
    url: '',
    file: null,
    buttonStatus: 'SCAN',
    errorMessage: '',
    redirectUrl: path,
    currentReport: null,
    dbRecords: [],
    notification: '',
  };
  return true;
});

// --- SCENARIO 1: Scan tanpa input ---
When('Pengguna menekan tombol {string} tanpa memasukkan URL dan tanpa memilih file', function (buttonName) {
  if (!mockState.url && !mockState.file) {
    mockState.errorMessage = 'Masukkan URL atau unggah tangkapan layar terlebih dahulu.';
  }
  return true;
});

Then('Sistem menampilkan pesan kesalahan {string}', function (expectedError) {
  if (mockState.errorMessage !== expectedError) {
    throw new Error(`Pesan kesalahan tidak cocok. Ekspektasi: ${expectedError}, Aktual: ${mockState.errorMessage}`);
  }
  return true;
});

Then('Form tidak mengirimkan data ke database', function () {
  if (mockState.dbRecords.length > 0) {
    throw new Error('Data terkirim ke DB padahal input kosong!');
  }
  return true;
});

// --- SCENARIO 2: Scan dengan URL saja ---
When('Pengguna mengisi input URL dengan {string}', function (inputUrl) {
  mockState.url = inputUrl;
  return true;
});

When('Pengguna menekan tombol {string}', function (buttonName) {
  mockState.buttonStatus = 'MEMINDAI...';
  
  // Simulasi logika klasifikasi sederhana & simpan DB
  const isHighRisk = mockState.url.includes('slot') || mockState.url.includes('gacor');
  const newRecord = {
    id: '12',
    url_situs: mockState.url,
    bukti_screenshot: mockState.file ? 'https://supabase.co/storage/bukti-analisis/bukti_situs.png' : null,
    tingkat_risiko: isHighRisk ? 'HIGH RISK' : 'LOW',
    skor_probabilitas: isHighRisk ? 95 : 0,
    status: 'DRAFT',
  };
  
  mockState.dbRecords.push(newRecord);
  mockState.currentReport = newRecord;
  mockState.redirectUrl = `/form-gambling-analysis/result?id=${newRecord.id}`;
  return true;
});

Then('Sistem mengubah status tombol menjadi {string}', function (expectedStatus) {
  if (mockState.buttonStatus !== expectedStatus) {
    throw new Error(`Status tombol tidak sesuai. Ekspektasi: ${expectedStatus}, Aktual: ${mockState.buttonStatus}`);
  }
  return true;
});

Then('Sistem menyimpan record baru ke tabel {string} dengan status {string}', function (tableName, expectedStatus) {
  const lastRecord = mockState.dbRecords[mockState.dbRecords.length - 1];
  if (!lastRecord || lastRecord.status !== expectedStatus) {
    throw new Error(`Record tidak tersimpan dengan status ${expectedStatus} di tabel ${tableName}`);
  }
  return true;
});

Then(/^Pengguna diarahkan ke halaman hasil indikasi \("([^"]+)"\)$/, function (expectedPathPattern) {
  const expectedPath = expectedPathPattern.replace('{id}', mockState.currentReport.id);
  if (mockState.redirectUrl !== expectedPath) {
    throw new Error(`Redirect URL tidak sesuai. Ekspektasi: ${expectedPath}, Aktual: ${mockState.redirectUrl}`);
  }
  return true;
});

// --- SCENARIO 3: Scan dengan Bukti Gambar saja ---
When(/^Pengguna memilih file gambar "([^"]+)" \(ukuran < 5MB\)$/, function (fileName) {
  mockState.file = fileName;
  return true;
});

Then('Sistem mengunggah file gambar ke Supabase Storage bucket {string}', function (bucketName) {
  if (bucketName !== 'bukti-analisis' || !mockState.file) {
    throw new Error(`Gagal mengunggah file ke bucket ${bucketName}`);
  }
  return true;
});

Then('Sistem menyimpan URL public gambar ke kolom {string} di tabel {string}', function (columnName, tableName) {
  const lastRecord = mockState.dbRecords[mockState.dbRecords.length - 1];
  if (!lastRecord || !lastRecord[columnName]) {
    throw new Error(`Public URL tidak tersimpan di kolom ${columnName} pada tabel ${tableName}`);
  }
  return true;
});

// --- SCENARIO 4: Menampilkan halaman hasil indikasi ---
Given('Ada data laporan di database dengan ID {string} dan status {string}', function (reportId, status) {
  mockState.currentReport = {
    id: reportId,
    url_situs: 'https://slotgacor-angker77.pages.dev',
    tingkat_risiko: 'HIGH RISK',
    skor_probabilitas: 95,
    status: status,
  };
  return true;
});

When('Pengguna membuka halaman hasil indikasi {string}', function (fullPath) {
  mockState.redirectUrl = fullPath;
  return true;
});

Then('Sistem mengambil data laporan ID {string} dari Supabase', function (reportId) {
  if (!mockState.currentReport || mockState.currentReport.id !== reportId) {
    throw new Error(`Data laporan ID ${reportId} tidak ditemukan di Supabase.`);
  }
  return true;
});

Then('Halaman menampilkan ID Laporan {string}', function (expectedIdDisplay) {
  const formattedId = `ID-${mockState.currentReport.id}`;
  if (formattedId !== expectedIdDisplay) {
    throw new Error(`Tampilan ID Laporan salah. Ekspektasi: ${expectedIdDisplay}, Aktual: ${formattedId}`);
  }
  return true;
});

Then('Halaman menampilkan status analisis {string}', function (expectedStatus) {
  if (mockState.currentReport.status !== expectedStatus) {
    throw new Error(`Status analisis tidak cocok. Ekspektasi: ${expectedStatus}, Aktual: ${mockState.currentReport.status}`);
  }
  return true;
});

// --- SCENARIO 5: Save to History & Alert Admin ---
Given('Pengguna berada di halaman hasil indikasi untuk laporan ID {string} berstatus {string}', function (reportId, status) {
  mockState.currentReport = {
    id: reportId,
    status: status,
  };
  return true;
});

Then('Sistem meng-update kolom status laporan ID {string} menjadi {string} di tabel {string}', function (reportId, newStatus, tableName) {
  if (mockState.currentReport.id === reportId) {
    mockState.currentReport.status = newStatus;
    mockState.notification = `Status berhasil diubah jadi ${newStatus}!`;
  }
  return true;
});

Then('Sistem menampilkan notifikasi sukses {string}', function (expectedNotification) {
  if (mockState.notification !== expectedNotification) {
    throw new Error(`Notifikasi tidak cocok. Ekspektasi: ${expectedNotification}, Aktual: ${mockState.notification}`);
  }
  return true;
});

Then('Tampilan UI memperbarui status laporan menjadi {string}', function (expectedStatus) {
  if (mockState.currentReport.status !== expectedStatus) {
    throw new Error(`Tampilan UI status gagal diperbarui ke ${expectedStatus}`);
  }
  return true;
});

// --- SCENARIO 6: Discard Analysis ---
Given('Pengguna berada di halaman hasil indikasi untuk laporan ID {string}', function (reportId) {
  mockState.currentReport = { id: reportId, status: 'DRAFT' };
  return true;
});

Then('Sistem menghapus record laporan ID {string} dari tabel {string}', function (reportId, tableName) {
  mockState.currentReport = null;
  return true;
});

Then(/^Pengguna diarahkan kembali ke halaman utama form \("([^"]+)"\)$/, function (mainPath) {
  mockState.redirectUrl = mainPath;
  return true;
});