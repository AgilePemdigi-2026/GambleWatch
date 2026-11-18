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

export interface DetectionSummary {
  request_id: string;
  overall_score: number; // 0..1
  overall_risk: 'low' | 'medium' | 'high';
  indication: 'Rendah' | 'Sedang' | 'Tinggi';
  processing_time_ms: number;
  modules: Record<ModuleKey, ModuleResult>;
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
        : 'Tidak dianalisis (tidak ada teks halaman)',
    bukti_deteksi: toBuktiDeteksi(summary),
  };
}
