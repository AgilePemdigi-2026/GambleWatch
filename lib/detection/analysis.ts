// Hasil DET-06 (POST /analyze) dan pemetaannya ke kolom tabel laporan_analisis.

export type ModuleKey = 'url_pattern' | 'visual_similarity' | 'ocr' | 'keyword_analysis';

export interface ModuleResult {
  status: 'ok' | 'skipped' | 'failed';
  label: string;
  score: number;
  findings: string[];
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
  };
}
