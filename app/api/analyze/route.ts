// Meneruskan analisis dari form ke layanan deteksi Python (DET-06, POST /analyze).
// Lewat server supaya alamat layanan tidak terbuka ke browser dan tidak perlu CORS.

import type { DetectionSummary } from '@/lib/detection/analysis';

const DETECTION_API_URL = process.env.DETECTION_API_URL ?? 'http://127.0.0.1:8000';
const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 60_000; // OCR pada gambar besar bisa butuh beberapa detik

function error(message: string, status: number) {
  return Response.json({ success: false, message }, { status });
}

// "contoh.com" -> "https://contoh.com"; layanan deteksi hanya menerima http/https.
function normalizeUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return '';
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
}

export async function POST(request: Request) {
  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return error('Format permintaan tidak valid.', 400);
  }

  const url = normalizeUrl(String(incoming.get('url') ?? ''));
  const screenshot = incoming.get('screenshot');
  const hasScreenshot = screenshot instanceof File && screenshot.size > 0;

  if (!url && !hasScreenshot) {
    return error('Masukkan URL atau unggah tangkapan layar terlebih dahulu.', 422);
  }
  if (hasScreenshot && screenshot.size > MAX_SCREENSHOT_BYTES) {
    return error('Ukuran gambar melebihi 5 MB.', 413);
  }

  const outgoing = new FormData();
  if (url) outgoing.set('url', url);
  if (hasScreenshot) outgoing.set('screenshot', screenshot, screenshot.name);

  let response: Response;
  try {
    response = await fetch(`${DETECTION_API_URL}/analyze`, {
      method: 'POST',
      body: outgoing,
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
    const message = response.status < 500 && typeof body.detail === 'string'
      ? body.detail
      : 'Layanan deteksi mengalami galat.';
    return error(message, response.status < 500 ? response.status : 502);
  }

  const summary = (await response.json()) as DetectionSummary;
  return Response.json({ success: true, url, summary });
}
