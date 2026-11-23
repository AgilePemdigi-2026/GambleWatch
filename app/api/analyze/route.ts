// Meneruskan analisis dari form ke layanan deteksi Python (DET-06).
// Lewat server supaya alamat dan kunci layanan tidak terbuka ke browser dan tidak perlu CORS.
//
//   * Ada URL  -> POST /scan: layanan MEMBUKA link-nya (Chromium headless), lalu menilai
//                 URL, teks halaman, dan screenshot halaman/unggahan dengan DET-01..04.
//   * Hanya gambar -> POST /analyze: OCR dan kemiripan visual atas unggahan.

import type { DetectionSummary } from '@/lib/detection/analysis';
import { validateReportUrl } from '@/lib/detection/url';

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
  return Response.json({ success: true, url, summary });
}
