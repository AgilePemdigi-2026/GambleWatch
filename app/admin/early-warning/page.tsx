'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Search,
  Plus,
  ArrowUpRight,
  AlertTriangle,
  UserPlus,
  CreditCard,
  Clock,
  RotateCw
} from 'lucide-react';

interface AlertDomain {
  id: string;
  domain: string;
  percentage: string;
  desc: string;
  icon: any;
  badgeBg: string;
}

interface PatternItem {
  id: string;
  patternName: string;
  domain: string;
  severity: string;
  date: string;
  dotColor: string;
  badgeBg: string;
}

// --- Pembacaan hasil mesin deteksi dari laporan_analisis ---

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

// Data baru memakai HIGH/MEDIUM/LOW; beberapa baris lama memakai "HIGH RISK"/"MEDIUM RISK"
function riskLevel(value: string | null): 'high' | 'medium' | 'low' | 'pending' {
  if (value === 'HIGH' || value === 'HIGH RISK') return 'high';
  if (value === 'MEDIUM' || value === 'MEDIUM RISK') return 'medium';
  if (value === 'LOW' || value === 'LOW RISK') return 'low';
  return 'pending';
}

const MODULE_SIGNALS: [string, string][] = [
  ['keyword_analysis', 'Kata kunci promosi judi'],
  ['ocr', 'Teks judi pada tangkapan layar'],
  ['url_pattern', 'Pola URL situs judi'],
  ['visual_similarity', 'Tampilan mirip situs judi'],
];

interface LaporanRow {
  tingkat_risiko: string | null;
  url_pattern_analysis?: string | null;
  keywords_found?: string | null;
  bukti_deteksi?: { modul?: Record<string, { status?: string; temuan?: string[] }> } | null;
}

// Sinyal utama sebuah laporan: modul pertama yang punya temuan (kata kunci > OCR > URL > visual)
function mainFinding(row: LaporanRow): { name: string; detail: string } {
  const modul = row.bukti_deteksi?.modul;
  if (modul) {
    for (const [key, name] of MODULE_SIGNALS) {
      const temuan = modul[key]?.temuan ?? [];
      if (modul[key]?.status === 'ok' && temuan.length) return { name, detail: temuan.slice(0, 3).join(', ') };
    }
  }
  // Laporan lama tanpa bukti_deteksi: ringkasan teks yang tersimpan
  if (row.url_pattern_analysis && !row.url_pattern_analysis.startsWith('Tidak dianalisis')) {
    return { name: 'Pola URL situs judi', detail: row.url_pattern_analysis };
  }
  if (row.keywords_found?.startsWith('Ditemukan')) return { name: 'Kata kunci promosi judi', detail: row.keywords_found };
  return {
    name: riskLevel(row.tingkat_risiko) === 'pending' ? 'Belum dianalisis mesin deteksi' : 'Tidak ada sinyal judi',
    detail: '',
  };
}

export default function EarlyWarningPage() {
  const [activeTab, setActiveTab] = useState('analisis');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'active' | 'all'>('active');
  const [timeRange, setTimeRange] = useState<'thisMonth' | 'sixMonths'>('sixMonths');
  const [loading, setLoading] = useState(true);

  // State Data Supabase
  const [allAlerts, setAllAlerts] = useState<AlertDomain[]>([]);
  const [patterns, setPatterns] = useState<PatternItem[]>([]);

  // Tren: rata-rata skor deteksi (0-100) per bulan, kunci "YYYY-MM".
  // Daftar bulan dihitung di klien setelah data dimuat (bukan saat render server).
  const [months, setMonths] = useState<{ key: string; name: string; year: number }[]>([]);
  const [monthlyScores, setMonthlyScores] = useState<Record<string, number>>({});
  const [lastUpdate, setLastUpdate] = useState('-');

  const supabase = createClient();

  useEffect(() => {
    let active = true;

    async function fetchEWRData() {
      try {
        const { data: records, error } = await supabase
          .from('laporan_analisis')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!active) return;

        // 6 bulan terakhir, berakhir di bulan ini
        const today = new Date();
        const monthList = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
          return { key: monthKey(d), name: MONTH_NAMES[d.getMonth()], year: d.getFullYear() };
        });
        setMonths(monthList);

        if (records && records.length > 0) {
          const icons = [AlertTriangle, UserPlus, CreditCard, Clock];
          const analysed = records.filter((row) => riskLevel(row.tingkat_risiko) !== 'pending');

          // 1. Kartu: laporan Tinggi/Sedang dengan skor tertinggi (dari skor deteksi asli)
          const mappedCards = analysed
            .filter((row) => ['high', 'medium'].includes(riskLevel(row.tingkat_risiko)))
            .sort((a, b) => (b.skor_probabilitas ?? 0) - (a.skor_probabilitas ?? 0))
            .map((row, index) => {
              const finding = mainFinding(row);
              const high = riskLevel(row.tingkat_risiko) === 'high';
              return {
                id: row.id,
                domain: row.url_situs || '-',
                percentage: `${Math.round(row.skor_probabilitas ?? 0)}%`,
                desc: finding.detail ? `${finding.name}: ${finding.detail}` : finding.name,
                icon: icons[index % icons.length],
                badgeBg: high
                  ? 'bg-rose-100 text-rose-700 border-rose-200'
                  : 'bg-amber-100 text-amber-800 border-amber-200',
              };
            });
          setAllAlerts(mappedCards);

          // 2. Tabel pola: sinyal utama dari bukti deteksi, keparahan dari tingkat risiko
          const mappedPatterns = records.map((row) => {
            const level = riskLevel(row.tingkat_risiko);
            const isHigh = level === 'high';
            const isMedium = level === 'medium';

            return {
              id: row.id,
              patternName: mainFinding(row).name,
              domain: row.url_situs || '-',
              severity: isHigh ? 'Kritis' : isMedium ? 'Peringatan' : level === 'low' ? 'Info' : 'Belum dianalisis',
              date: row.created_at ? row.created_at.split('T')[0] : '-',
              dotColor: isHigh ? 'bg-rose-500' : isMedium ? 'bg-amber-500' : level === 'low' ? 'bg-blue-500' : 'bg-stone-400',
              badgeBg: isHigh
                ? 'bg-rose-100 text-rose-800 border-rose-200'
                : isMedium
                ? 'bg-amber-100 text-amber-800 border-amber-200'
                : 'bg-slate-100 text-slate-700 border-slate-200',
            };
          });
          setPatterns(mappedPatterns);

          // 3. Rata-rata skor per bulan (hanya laporan yang sudah dianalisis)
          const sums: Record<string, { total: number; n: number }> = {};
          analysed.forEach((row) => {
            if (!row.created_at || typeof row.skor_probabilitas !== 'number') return;
            const key = monthKey(new Date(row.created_at));
            sums[key] = sums[key] ?? { total: 0, n: 0 };
            sums[key].total += row.skor_probabilitas;
            sums[key].n += 1;
          });
          setMonthlyScores(Object.fromEntries(
            Object.entries(sums).map(([key, s]) => [key, Math.round(s.total / s.n)]),
          ));

          if (records[0].created_at) {
            const d = new Date(records[0].created_at);
            setLastUpdate(`${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`);
          }
        }
      } catch (err) {
        console.error('Error fetching EWR data:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchEWRData();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- LOGIKA FILTER SEARCH REAL-TIME UNTUK CARD DAN TABEL ---
  const query = searchTerm.toLowerCase().trim();

  // Filter 4 Card Atas berdasarkan kata kunci search
  const filteredCards = allAlerts.filter(
    (card) =>
      query === '' ||
      card.domain.toLowerCase().includes(query) ||
      card.desc.toLowerCase().includes(query)
  );

  const displayedCards = filteredCards.slice(0, 4);

  // Filter Tabel berdasarkan kata kunci search + toggle status
  const filteredPatterns = patterns.filter((item) => {
    const matchesSearch =
      query === '' ||
      item.patternName.toLowerCase().includes(query) ||
      item.domain.toLowerCase().includes(query);

    const matchesTab =
      filterTab === 'all' || item.severity === 'Kritis' || item.severity === 'Peringatan';

    return matchesSearch && matchesTab;
  });

  const activePatternsCount = patterns.filter(
    (p) => p.severity === 'Kritis' || p.severity === 'Peringatan'
  ).length;

  // --- LOGIKA GRAFIK TREN BULANAN SVG ---
  // Nilai titik = rata-rata skor deteksi (0-100) laporan pada bulan itu
  const monthListEWR = timeRange === 'thisMonth' ? months.slice(-1) : months;

  const rawChartPoints = monthListEWR.map((m, idx) => {
    const xStep = timeRange === 'thisMonth' ? 0 : 140;
    const startX = timeRange === 'thisMonth' ? 400 : 50;
    return {
      x: startX + idx * xStep,
      val: monthlyScores[m.key] ?? 0,
      month: m.name,
    };
  });

  // Skor selalu 0-100, jadi sumbu tetap
  const maxVal = 100;

  const calculatedPoints = rawChartPoints.map((pt) => ({
    ...pt,
    y: Math.max(170 - (pt.val / maxVal) * 130, 30),
  }));

  const firstY = calculatedPoints[0]?.y ?? 170;
  const svgPathD = timeRange === 'thisMonth'
    ? `M 400 ${firstY}`
    : calculatedPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');

  const svgAreaD = !calculatedPoints.length
    ? ''
    : timeRange === 'thisMonth'
    ? `M 380 ${firstY} L 420 ${firstY} L 420 190 L 380 190 Z`
    : `${svgPathD} L 750 190 L 50 190 Z`;

  const periodLabel = months.length
    ? timeRange === 'thisMonth'
      ? `${months[months.length - 1].name} ${months[months.length - 1].year}`
      : `${months[0].name} ${months[0].year} – ${months[months.length - 1].name} ${months[months.length - 1].year}`
    : '…';

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#3B1E12] flex flex-col justify-between font-sans">
      {/* Top Header Navbar */}
      <div className="px-6 pt-4">
        <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center px-8 py-3 bg-[#F7F2EB] rounded-full shadow-sm gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="GambleWatch Logo" width={36} height={36} className="object-contain" />
            <div>
              <span className="font-black text-xl tracking-wider text-[#3B1E12] block leading-none" style={{ fontFamily: 'var(--font-holtwood), serif' }}>
                GAMBLEWATCH
              </span>
              <span className="text-[10px] text-stone-500 font-medium">Deteksi perjudian online ilegal</span>
            </div>
          </Link>

          <nav className="flex items-center gap-3 bg-white/80 px-4 py-1.5 rounded-full text-xs font-bold text-[#3B1E12] border border-stone-200">
            <Link 
              href="/admin" 
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all ${activeTab === 'beranda' ? 'bg-[#F7F2EB] font-black border border-stone-300' : 'opacity-70 hover:opacity-100'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Beranda
            </Link>

            <Link 
              href="/admin/early-warning" 
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all ${activeTab === 'analisis' ? 'bg-[#F7F2EB] font-black border border-stone-300' : 'opacity-70 hover:opacity-100'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Analisis perjudian
            </Link>

            <Link href="/admin/feedback" className="opacity-70 hover:opacity-100 transition-opacity px-3 py-1.5 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Umpan balik
            </Link>
          </nav>

          <button className="bg-[#3B1E12] text-white px-6 py-2.5 rounded-full font-black text-xs tracking-wider uppercase flex items-center gap-2 hover:bg-[#28130a] transition-all">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Analisis saya
          </button>
        </header>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto my-8 px-6 w-full flex-grow">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#2C1810]">Analisis Peringatan Dini</h1>
            <p className="text-xs text-stone-600 mt-1">
              Pantau dan analisis indikator peringatan dini lonjakan aktivitas perjudian di berbagai domain terindikasi.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Input Search Real-time */}
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari domain atau nama pola..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E2D7C7] rounded-full text-xs text-[#2C1810] placeholder-stone-400 focus:outline-none focus:border-stone-400 shadow-2xs font-medium"
              />
            </div>

            <Link
              href="/form-gamblin-analysis"
              className="bg-[#3B1E12] text-white px-5 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 hover:bg-[#28130a] transition-all shrink-0 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Jalankan Analisis Baru
            </Link>
          </div>
        </div>

        {/* 4 Card Anomali Domain (Tersaring secara Live oleh Input Search) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {loading ? (
            <div className="col-span-4 text-center py-8 text-xs font-semibold text-stone-500 flex items-center justify-center gap-2">
              <RotateCw className="w-4 h-4 animate-spin text-[#3B1E12]" /> Memuat data peringatan dini...
            </div>
          ) : displayedCards.length === 0 ? (
            <div className="col-span-4 bg-[#FAF5EE] p-6 rounded-2xl border border-[#E2D7C7] text-center text-xs text-stone-500">
              Tidak ada domain yang cocok dengan kata kunci &quot;{searchTerm}&quot;
            </div>
          ) : (
            displayedCards.map((card, idx) => {
              const IconComponent = card.icon;
              return (
                <div
                  key={idx}
                  className="bg-[#FAF5EE] p-5 rounded-2xl border border-[#E2D7C7] shadow-sm flex flex-col justify-between hover:border-stone-400 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-xs text-[#2C1810] font-mono truncate max-w-[140px]">
                        {card.domain}
                      </span>
                      <span
                        className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${card.badgeBg}`}
                      >
                        {card.percentage}
                        <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>

                    <div className="flex items-start gap-3 mt-3">
                      <div className="p-2 bg-white rounded-xl border border-stone-200 text-[#3B1E12] shrink-0 shadow-2xs">
                        <IconComponent className="w-4 h-4 text-amber-700" />
                      </div>
                      <p className="text-[11px] text-stone-600 leading-relaxed font-medium line-clamp-2">
                        {card.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Section Grafik Tren Indikasi */}
        <div className="mb-8">
          <h2 className="text-base font-extrabold text-[#2C1810] mb-3">Tren indikasi</h2>
          <div className="bg-[#FAF5EE] p-6 rounded-2xl border border-[#E2D7C7] shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-bold text-sm text-[#2C1810]">
                  Tren Indikasi Sepanjang Waktu
                </h3>
                <p className="text-[11px] text-stone-500">
                  Rata-rata skor indikasi judi (0–100) dari mesin deteksi per bulan ({periodLabel})
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select className="py-1.5 px-3 bg-white border border-stone-300 rounded-full text-xs font-semibold text-[#3B1E12] focus:outline-none shadow-2xs">
                  <option>Filter: Semua Indikator</option>
                </select>

                <div className="flex items-center bg-white border border-stone-300 p-1 rounded-full text-xs font-bold text-[#3B1E12]">
                  <button
                    onClick={() => setTimeRange('thisMonth')}
                    className={`px-3 py-1 rounded-full transition-all ${
                      timeRange === 'thisMonth'
                        ? 'bg-[#F7F2EB] text-[#3B1E12] border border-stone-300 font-black'
                        : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    Bulan Ini
                  </button>
                  <button
                    onClick={() => setTimeRange('sixMonths')}
                    className={`px-3 py-1 rounded-full transition-all ${
                      timeRange === 'sixMonths'
                        ? 'bg-[#F7F2EB] text-[#3B1E12] border border-stone-300 font-black'
                        : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    6 Bulan Terakhir
                  </button>
                </div>
              </div>
            </div>

            {/* Line Chart SVG */}
            <div className="relative w-full h-64 my-4">
              <svg viewBox="0 0 800 200" className="w-full h-full overflow-visible">
                {/* Garis sumbu di posisi yang sama dengan rumus titik: y = 170 - nilai/maks * 130 */}
                {[1, 0.75, 0.5, 0.25, 0].map((f) => (
                  <g key={f}>
                    <line x1="0" y1={170 - f * 130} x2="800" y2={170 - f * 130} stroke="#E2D7C7" strokeDasharray="4 4" />
                    <text x="-15" y={174 - f * 130} className="text-[10px] fill-stone-500 font-mono font-bold">{Math.round(maxVal * f)}</text>
                  </g>
                ))}

                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B1E12" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#3B1E12" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={svgAreaD} fill="url(#chartGradient)" />
                {timeRange === 'sixMonths' && (
                  <path d={svgPathD} fill="none" stroke="#3B1E12" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                )}

                {calculatedPoints.map((pt, i) => (
                  <g key={i}>
                    <rect x={pt.x - 14} y={pt.y - 25} width="28" height="18" rx="4" fill="#3B1E12" />
                    <text x={pt.x} y={pt.y - 13} textAnchor="middle" className="text-[10px] font-bold fill-white font-mono">
                      {pt.val}
                    </text>
                    <circle cx={pt.x} cy={pt.y} r="5" fill="#FFFFFF" stroke="#3B1E12" strokeWidth="3" />
                    <text x={pt.x} y="215" textAnchor="middle" className="text-xs font-bold fill-[#2C1810]">
                      {pt.month}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-[#E2D7C7] text-xs text-stone-600 gap-2 mt-4 font-medium">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3B1E12]"></span>
                  Rata-rata skor deteksi laporan
                </span>
                <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-[10px]">
                  Mesin deteksi DET-01 – DET-04
                </span>
              </div>
              <p>Laporan terakhir masuk: <span className="font-bold text-[#2C1810]">{lastUpdate}</span></p>
            </div>
          </div>
        </div>

        {/* Section Tabel Pola Terindikasi */}
        <div className="mb-8">
          <h2 className="text-base font-extrabold text-[#2C1810] mb-3">Pola terindikasi</h2>
          <div className="bg-[#FAF5EE] rounded-2xl border border-[#E2D7C7] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-[#E2D7C7] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-sm text-[#2C1810]">Daftar Anomali Terdeteksi</h3>
                <p className="text-[11px] text-stone-500">
                  Daftar domain terdeteksi dengan anomali pola sinyal risiko tinggi
                </p>
              </div>

              <div className="flex items-center bg-white border border-stone-300 p-1 rounded-full text-xs font-bold text-[#3B1E12]">
                <button
                  onClick={() => setFilterTab('active')}
                  className={`px-3 py-1.5 rounded-full transition-all ${
                    filterTab === 'active'
                      ? 'bg-[#F7F2EB] text-[#3B1E12] border border-stone-300 font-black'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  Tampilkan: Aktif ({activePatternsCount})
                </button>
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1.5 rounded-full transition-all ${
                    filterTab === 'all'
                      ? 'bg-[#F7F2EB] text-[#3B1E12] border border-stone-300 font-black'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  Semua Pola ({patterns.length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F2EB] border-b border-[#E2D7C7] text-stone-500 font-bold tracking-wider uppercase">
                  <tr>
                    <th className="py-3.5 px-6">NAMA POLA</th>
                    <th className="py-3.5 px-6">DOMAIN TERKAIT</th>
                    <th className="py-3.5 px-6">TINGKAT KEPARAHAN</th>
                    <th className="py-3.5 px-6">TANGGAL TERDETEKSI</th>
                    <th className="py-3.5 px-6 text-right">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2D7C7]">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-stone-500">
                        Memuat data pola...
                      </td>
                    </tr>
                  ) : filteredPatterns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-stone-500">
                        Tidak ada pola terindikasi yang cocok dengan kata kunci &quot;{searchTerm}&quot;.
                      </td>
                    </tr>
                  ) : (
                    filteredPatterns.map((item) => (
                      <tr key={item.id} className="hover:bg-white/60 transition-colors">
                        <td className="py-4 px-6 font-bold text-[#2C1810]">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full ${item.dotColor}`}></span>
                            {item.patternName}
                          </div>
                        </td>

                        <td className="py-4 px-6 font-mono text-stone-600 font-semibold">
                          {item.domain}
                        </td>

                        <td className="py-4 px-6">
                          <span
                            className={`inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-bold border ${item.badgeBg}`}
                          >
                            {item.severity}
                          </span>
                        </td>

                        <td className="py-4 px-6 text-stone-600 font-mono">
                          {item.date}
                        </td>

                        {/* TOMBOL LIHAT DETAIL MODUL EWR */}
                        <td className="py-4 px-6 text-right">
                          <Link
                            href={`/admin/early-warning/${item.id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white border border-stone-300 text-[#3B1E12] hover:bg-stone-50 text-xs font-bold transition-all shadow-2xs"
                          >
                            Lihat Detail
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-[#E2D7C7] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-600 font-medium">
              <div>
                Menampilkan <span className="font-bold text-[#2C1810]">{filteredPatterns.length}</span> dari{' '}
                <span className="font-bold text-[#2C1810]">{patterns.length}</span> Pola Terindikasi
              </div>

              <div className="flex items-center gap-1.5">
                <button className="px-3 py-1.5 rounded-full border border-stone-300 bg-white hover:bg-stone-50 text-stone-600 transition disabled:opacity-50 font-bold">
                  Sebelumnya
                </button>
                <button className="w-7 h-7 rounded-full bg-[#3B1E12] text-white font-black text-xs flex items-center justify-center shadow-xs">
                  1
                </button>
                <button className="px-3 py-1.5 rounded-full border border-stone-300 bg-white hover:bg-stone-50 text-stone-600 transition font-bold">
                  Selanjutnya
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Container */}
      <footer className="mt-8 bg-[#F7F2EB] rounded-t-3xl px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-stone-600 font-medium">
          <p>© 2026 Kementerian Komunikasi dan Digital (KOMDIGI). Hak cipta dilindungi.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-stone-900 transition-colors">Tentang web</a>
            <a href="#" className="hover:text-stone-900 transition-colors">Kebijakan privasi</a>
            <a href="#" className="bg-[#FAF5EE] border border-stone-300 text-stone-800 px-5 py-2 rounded-full font-semibold shadow-sm hover:bg-stone-50 transition-all flex items-center gap-1.5">
              Hubungi dukungan
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}