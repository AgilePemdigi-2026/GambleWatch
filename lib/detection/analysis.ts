// Hasil DET-06 (POST /analyze) dan pemetaannya ke kolom tabel laporan_analisis.

export type ModuleKey = 'url_pattern' | 'visual_similarity' | 'ocr' | 'keyword_analysis';

export interface Passage {
  text: string;
  highlights: string[];
  category: string;
}

export interface ModuleResult {
  status: 'ok' | 'skipped' | 'failed';
  label: string;
  score: number;
  findings: string[];
  passages?: Passage[]; // keyword_analysis, ocr
  ocr_text?: string; // ocr
}

// Hasil membuka link (POST /scan). Tidak ada bila hanya gambar yang dianalisis.
export interface ScanInfo {
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED';
  failure_code: string | null; // DNS, TIMEOUT, BOT_PROTECTION, BLOCKED, ...
  message: string; // penjelasan siap tampil, mis. "Halaman berhasil dibuka dan isinya dianalisis."
  requested_url: string;
  final_url: string | null; // setelah redirect
  http_status: number | null;
  title: string | null;
  redirect_chain: string[];
  text_chars: number;
  links: number;
  load_ms: number | null;
  screenshot_source: 'halaman' | 'unggahan' | null;
  screenshot_base64: string | null; // PNG/JPEG layar pertama halaman, untuk disimpan sebagai bukti
}

export interface DetectionSummary {
  request_id: string;
  overall_score: number; // 0..1
  overall_risk: 'low' | 'medium' | 'high';
  indication: 'Rendah' | 'Sedang' | 'Tinggi';
  processing_time_ms: number;
  modules: Record<ModuleKey, ModuleResult>;
  scan?: ScanInfo;
}

// Kolom laporan_analisis yang diisi dari hasil deteksi.
export interface LaporanDetectionFields {
  tingkat_risiko: 'HIGH' | 'MEDIUM' | 'LOW';
  skor_probabilitas: number; // 0..100, sama dengan skala halaman admin (87 / 100)
  url_pattern_analysis: string;
  visual_similarity: string;
  ocr_flagged: boolean;
  keywords_found: string;
  bukti_deteksi: BuktiDeteksi;
}

// Isi kolom laporan_analisis.bukti_deteksi (jsonb): bukti lengkap untuk halaman admin.
export interface PotonganTeks {
  kalimat: string;
  highlight: string[];
  kategori: string;
  sumber: 'teks halaman' | 'screenshot (OCR)';
}

export interface BuktiModul {
  status: ModuleResult['status'];
  label: string;
  skor: number; // 0..100
  temuan: string[];
}

// Halaman yang dibuka saat analisis (tanpa screenshot: itu disimpan di Storage/bukti_screenshot)
export interface HalamanDipindai {
  status: ScanInfo['status'];
  kode_gagal: string | null;
  keterangan: string;
  url_diminta: string;
  url_akhir: string | null;
  kode_http: number | null;
  judul: string | null;
  rantai_redirect: string[];
  jumlah_karakter_teks: number;
  jumlah_link: number;
  sumber_screenshot: ScanInfo['screenshot_source'];
}

export interface BuktiDeteksi {
  versi: 1;
  request_id: string;
  dianalisis_pada: string; // ISO 8601
  skor: number; // 0..100
  indikasi: DetectionSummary['indication'];
  waktu_proses_ms: number;
  modul: Record<ModuleKey, BuktiModul>;
  potongan_teks: PotonganTeks[];
  teks_ocr: string | null;
  halaman?: HalamanDipindai | null; // tidak ada pada laporan sebelum fitur pemindaian link
}

const MODULE_KEYS: ModuleKey[] = ['url_pattern', 'visual_similarity', 'ocr', 'keyword_analysis'];

export function toBuktiDeteksi(summary: DetectionSummary, analysedAt = new Date()): BuktiDeteksi {
  const modul = {} as Record<ModuleKey, BuktiModul>;
  for (const key of MODULE_KEYS) {
    const m = summary.modules[key];
    modul[key] = {
      status: m?.status ?? 'skipped',
      label: m?.label ?? 'Skipped',
      skor: percent(m?.score ?? 0),
      temuan: m?.findings ?? [],
    };
  }

  const potongan = (passages: Passage[] | undefined, sumber: PotonganTeks['sumber']) =>
    (passages ?? []).map((p) => ({ kalimat: p.text, highlight: p.highlights, kategori: p.category, sumber }));

  return {
    versi: 1,
    request_id: summary.request_id,
    dianalisis_pada: analysedAt.toISOString(),
    skor: percent(summary.overall_score),
    indikasi: summary.indication,
    waktu_proses_ms: summary.processing_time_ms,
    modul,
    potongan_teks: [
      ...potongan(summary.modules.keyword_analysis?.passages, 'teks halaman'),
      ...potongan(summary.modules.ocr?.passages, 'screenshot (OCR)'),
    ],
    teks_ocr: summary.modules.ocr?.ocr_text ?? null,
    halaman: summary.scan ? toHalaman(summary.scan) : null,
  };
}

function toHalaman(scan: ScanInfo): HalamanDipindai {
  return {
    status: scan.status,
    kode_gagal: scan.failure_code,
    keterangan: scan.message,
    url_diminta: scan.requested_url,
    url_akhir: scan.final_url,
    kode_http: scan.http_status,
    judul: scan.title,
    rantai_redirect: scan.redirect_chain,
    jumlah_karakter_teks: scan.text_chars,
    jumlah_link: scan.links,
    sumber_screenshot: scan.screenshot_source,
  };
}

const RISK_COLUMN = { high: 'HIGH', medium: 'MEDIUM', low: 'LOW' } as const;

function percent(score: number): number {
  return Math.round(score * 1000) / 10; // satu angka di belakang koma
}

function describe(module: ModuleResult | undefined, notRun: string): string {
  if (!module || module.status === 'skipped') return notRun;
  if (module.status === 'failed') return `Gagal dijalankan (${module.label})`;
  const detail = module.findings.length ? `: ${module.findings.join('; ')}` : '';
  return `${module.label} (${percent(module.score)}%)${detail}`;
}

export function toLaporanFields(summary: DetectionSummary): LaporanDetectionFields {
  const { modules } = summary;
  const ocr = modules.ocr;
  const keywordModule = modules.keyword_analysis;
  const words = [...(keywordModule?.findings ?? []), ...(ocr?.findings ?? [])];

  return {
    tingkat_risiko: RISK_COLUMN[summary.overall_risk],
    skor_probabilitas: percent(summary.overall_score),
    url_pattern_analysis: describe(modules.url_pattern, 'Tidak dianalisis (URL tidak diisi)'),
    visual_similarity: describe(modules.visual_similarity, 'Tidak dianalisis (tanpa tangkapan layar atau indeks referensi)'),
    ocr_flagged: ocr?.status === 'ok' && ocr.label === 'OCR Flagged',
    keywords_found: words.length
      ? `Ditemukan: ${[...new Set(words)].join(', ')}`
      : keywordModule?.status === 'ok' || ocr?.status === 'ok'
        ? 'Tidak ditemukan kata kunci judi'
        : summary.scan && summary.scan.status !== 'SUCCESS'
          ? `Tidak dianalisis (${summary.scan.message.replace(/ Dinilai dari URL saja\.$/, '')})`
          : 'Tidak dianalisis (tidak ada teks halaman)',
    bukti_deteksi: toBuktiDeteksi(summary),
  };
}
