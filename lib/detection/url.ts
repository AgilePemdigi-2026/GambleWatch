// Validasi link yang dilaporkan masyarakat. Dipakai di form (browser) DAN di route
// /api/analyze (server), supaya permintaan langsung ke API juga tidak bisa melewatinya.
//
// Link harus LENGKAP dan berstruktur jelas:
//   https://contoh-situs.com          ok
//   http://slot88.xyz/daftar?ref=1     ok
//   contoh-situs.com                   ditolak: tanpa http:// atau https://
//   https://slotgacor88                ditolak: tanpa ekstensi domain (.com, .xyz, ...)
//   https://contoh situs.com           ditolak: berisi spasi

export const URL_EXAMPLE = 'https://contoh-situs.com';
const MAX_URL_LENGTH = 2048;

// label domain: huruf/angka/tanda hubung, tidak diawali/diakhiri tanda hubung
const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
// ekstensi domain: minimal 2 huruf, atau bentuk punycode (xn--...)
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/;

/** Pesan galat bila link tidak lengkap/tidak valid, atau null bila link boleh dipakai. */
export function validateReportUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null; // kosong ditangani terpisah (boleh bila ada gambar)

  if (value.length > MAX_URL_LENGTH) return 'Link terlalu panjang.';
  if (/\s/.test(value)) return 'Link tidak boleh berisi spasi.';
  if (!/^https?:\/\//i.test(value)) {
    return `Masukkan link lengkap yang diawali http:// atau https://, contoh: ${URL_EXAMPLE}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return `Format link tidak valid. Contoh link yang benar: ${URL_EXAMPLE}`;
  }
  if (parsed.username || parsed.password) return 'Link tidak boleh berisi nama pengguna atau kata sandi.';

  const labels = parsed.hostname.toLowerCase().replace(/\.$/, '').split('.');
  const tld = labels[labels.length - 1];
  if (labels.length < 2 || !TLD.test(tld) || !labels.every((label) => LABEL.test(label))) {
    return `Link harus memuat nama domain yang lengkap (mis. .com, .id, .xyz). Contoh: ${URL_EXAMPLE}`;
  }
  return null;
}
