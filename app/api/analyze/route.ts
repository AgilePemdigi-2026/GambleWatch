// Analisis dari form: panggil layanan deteksi Python (DET-06), lalu SIMPAN laporannya di server.
// Browser hanya menerima id laporan, sehingga hasil deteksi (risiko, skor, bukti) tidak bisa
// dipalsukan dari browser.
//
//   * Ada URL  -> POST /scan: layanan MEMBUKA link-nya (Chromium headless), lalu menilai
//                 URL, teks halaman, dan screenshot halaman/unggahan dengan DET-01..04.
//   * Hanya gambar -> POST /analyze: OCR dan kemiripan visual atas unggahan.
//
// Penyimpanan memakai SUPABASE_SERVICE_ROLE_KEY (lib/supabase/server.ts). Header
// x-gamblewatch-dry-run: 1 (hanya di luar production) menjalankan semuanya tanpa menulis ke
// Supabase; dipakai BDD supaya tes tidak mengisi database tim.

import { toLaporanFields, type DetectionSummary } from '@/lib/detection/analysis';
import { validateReportUrl } from '@/lib/detection/url';
import { createSessionClient, createWriterClient } from '@/lib/supabase/server';

const EVIDENCE_BUCKET = 'bukti-analisis';
const DRY_RUN_ID = 990001;

const DETECTION_API_URL = process.env.DETECTION_API_URL ?? 'http://127.0.0.1:8001';
const DETECTION_API_KEY = process.env.DETECTION_API_KEY ?? '';
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
// Membuka halaman (maks. ±30 detik) + OCR screenshot; lebih longgar dari batas di layanan
const TIMEOUT_MS = 90_000;

function error(message: string, status: number) {
  return Response.json({ success: false, message }, { status });
}

export async function POST(request: Request) {
  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return error('Format permintaan tidak valid.', 400);
  }

  const url = String(incoming.get('url') ?? '').trim();
  const screenshot = incoming.get('screenshot');
  const hasScreenshot = screenshot instanceof File && screenshot.size > 0;

  if (!url && !hasScreenshot) {
    return error('Masukkan URL atau unggah tangkapan layar terlebih dahulu.', 422);
  }
  // Link harus lengkap (https://domain.tld); yang tidak lengkap ditolak, tidak ditebak
  const urlError = validateReportUrl(url);
  if (urlError) return error(urlError, 422);
  if (hasScreenshot && screenshot.size > MAX_SCREENSHOT_BYTES) {
    return error('Ukuran gambar melebihi 5 MB.', 413);
  }

  const outgoing = new FormData();
  if (url) outgoing.set('url', url);
  if (hasScreenshot) outgoing.set('screenshot', screenshot, screenshot.name);

  const headers: Record<string, string> = {};
  if (DETECTION_API_KEY) headers['X-API-Key'] = DETECTION_API_KEY;

  let response: Response;
  try {
    response = await fetch(`${DETECTION_API_URL}${url ? '/scan' : '/analyze'}`, {
      method: 'POST',
      body: outgoing,
      headers,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
    return error(
      timedOut
        ? 'Analisis terlalu lama. Coba lagi beberapa saat lagi.'
        : 'Layanan deteksi tidak dapat dihubungi. Pastikan API deteksi berjalan.',
      timedOut ? 504 : 503,
    );
  }

  if (!response.ok) {
    // FastAPI mengirim pesan dalam "detail"; teruskan pesan validasi, sembunyikan galat server.
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) return error('Layanan deteksi menolak akses (API key).', 502);
    const message = response.status < 500 && typeof body.detail === 'string'
      ? body.detail
      : 'Layanan deteksi mengalami galat.';
    return error(message, response.status < 500 ? response.status : 502);
  }

  const summary = (await response.json()) as DetectionSummary;

  // Gambar bukti: unggahan pengguna, atau screenshot halaman yang dibuka layanan deteksi
  const evidence = hasScreenshot ? screenshot : screenshotFromScan(summary);
  if (summary.scan) summary.scan.screenshot_base64 = null; // tidak perlu dikirim balik ke browser

  const laporan = {
    url_situs: url || 'Hanya Unggahan Gambar',
    bukti_screenshot: null as string | null,
    status: 'DRAFT',
    user_id: await reporterId(),
    ...toLaporanFields(summary),
  };

  const dryRun = request.headers.get('x-gamblewatch-dry-run') === '1' && process.env.NODE_ENV !== 'production';
  if (dryRun) {
    return Response.json({ success: true, url, summary, id: DRY_RUN_ID, laporan });
  }

  const { client } = createWriterClient();
  if (evidence) {
    const ext = evidence.type === 'image/png' ? 'png' : 'jpg';
    const path = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const { error: uploadError } = await client.storage
      .from(EVIDENCE_BUCKET)
      .upload(path, evidence, { contentType: evidence.type });
    if (uploadError) {
      console.error('Gagal mengunggah bukti:', uploadError.message);
    } else {
      laporan.bukti_screenshot = client.storage.from(EVIDENCE_BUCKET).getPublicUrl(path).data.publicUrl;
    }
  }

  const { data: saved, error: saveError } = await client
    .from('laporan_analisis')
    .insert(laporan)
    .select('id')
    .single();
  if (saveError || !saved) {
    console.error('Gagal menyimpan laporan:', saveError?.message);
    return error('Analisis selesai, tetapi laporan gagal disimpan. Coba lagi beberapa saat lagi.', 500);
  }

  return Response.json({ success: true, url, summary, id: saved.id });
}

// Pengguna yang sedang masuk (null bila melapor tanpa akun)
async function reporterId(): Promise<string | null> {
  try {
    const supabase = await createSessionClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

// Screenshot halaman dari hasil pemindaian link (base64) -> berkas untuk Storage
function screenshotFromScan(summary: DetectionSummary): File | null {
  const data = summary.scan?.screenshot_base64;
  if (!data || summary.scan?.screenshot_source !== 'halaman') return null;
  const bytes = Buffer.from(data, 'base64');
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  return new File([bytes], `halaman.${isPng ? 'png' : 'jpg'}`, { type: isPng ? 'image/png' : 'image/jpeg' });
}
