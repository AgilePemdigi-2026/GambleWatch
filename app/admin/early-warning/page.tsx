'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminHeader from '@/components/AdminHeader';
import AdminFooter from '@/components/AdminFooter';
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

export default function EarlyWarningPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'active' | 'all'>('active');
  const [timeRange, setTimeRange] = useState<'thisMonth' | 'sixMonths'>('sixMonths');
  const [loading, setLoading] = useState(true);

  const [currentMonthIndex, setCurrentMonthIndex] = useState(10);

  const [allAlerts, setAllAlerts] = useState<AlertDomain[]>([]);
  const [patterns, setPatterns] = useState<PatternItem[]>([]);
  
  const [monthlyCounts, setMonthlyCounts] = useState<{ [key: number]: number }>({
    5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0
  });

  const supabase = createClient();

  useEffect(() => {
    setCurrentMonthIndex(new Date().getMonth());

    async function fetchEWRData() {
      setLoading(true);
      try {
        const { data: records, error } = await supabase
          .from('laporan_analisis')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (records && records.length > 0) {
          const icons = [AlertTriangle, UserPlus, CreditCard, Clock];
          
          const mappedCards = records.map((row, index) => ({
            id: row.id,
            domain: row.url_situs || row.domain || `domain-00${index + 1}.com`,
            percentage: row.tingkat_risiko === 'HIGH RISK' ? '+42%' : '+18%',
            desc: row.catatan || row.alasan_indikasi || 'Pola transaksi / aktivitas tidak wajar terdeteksi.',
            icon: icons[index % icons.length],
            badgeBg: row.tingkat_risiko === 'HIGH RISK' 
              ? 'bg-rose-100 text-rose-700 border-rose-200' 
              : 'bg-amber-100 text-amber-800 border-amber-200',
          }));
          setAllAlerts(mappedCards);

          const mappedPatterns = records.map((row) => {
            const isHigh = row.tingkat_risiko === 'HIGH RISK';
            const isMedium = row.tingkat_risiko === 'MEDIUM RISK' || row.tingkat_risiko === 'PENDING';
            
            return {
              id: row.id,
              patternName: row.kategori_indikasi || row.jenis_pelanggaran || 'Multiple Fast Transactions',
              domain: row.url_situs || row.domain || 'domain-terindikasi.com',
              severity: isHigh ? 'Kritis' : isMedium ? 'Peringatan' : 'Info',
              date: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
              dotColor: isHigh ? 'bg-rose-500' : isMedium ? 'bg-[#3B1E12]' : 'bg-blue-500',
              badgeBg: isHigh 
                ? 'bg-rose-100 text-rose-800 border-rose-200' 
                : isMedium 
                ? 'bg-amber-100 text-amber-800 border-amber-200' 
                : 'bg-slate-100 text-slate-700 border-slate-200',
            };
          });
          setPatterns(mappedPatterns);

          const counts: { [key: number]: number } = { 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
          records.forEach((row) => {
            if (row.created_at) {
              const monthIndex = new Date(row.created_at).getMonth();
              if (monthIndex >= 5 && monthIndex <= 10) {
                counts[monthIndex] = (counts[monthIndex] || 0) + 1;
              }
            }
          });
          setMonthlyCounts(counts);
        }
      } catch (err) {
        console.error('Error fetching EWR data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchEWRData();
  }, [supabase]);

  const query = searchTerm.toLowerCase().trim();

  const filteredCards = allAlerts.filter(
    (card) =>
      query === '' ||
      card.domain.toLowerCase().includes(query) ||
      card.desc.toLowerCase().includes(query)
  );

  const displayedCards = filteredCards.slice(0, 4);

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

  const monthListEWR = timeRange === 'thisMonth' 
    ? [{ name: 'Nov', index: currentMonthIndex >= 5 && currentMonthIndex <= 10 ? currentMonthIndex : 10 }]
    : [
        { name: 'Jun', index: 5 },
        { name: 'Jul', index: 6 },
        { name: 'Agu', index: 7 },
        { name: 'Sep', index: 8 },
        { name: 'Okt', index: 9 },
        { name: 'Nov', index: 10 },
      ];

  const rawChartPoints = monthListEWR.map((m, idx) => {
    const xStep = timeRange === 'thisMonth' ? 0 : 140;
    const startX = timeRange === 'thisMonth' ? 400 : 50;
    return {
      x: startX + idx * xStep,
      val: monthlyCounts[m.index] || 0,
      month: m.name,
    };
  });

  const maxVal = Math.max(...rawChartPoints.map((p) => p.val), 5);
  
  const calculatedPoints = rawChartPoints.map((pt) => ({
    ...pt,
    y: Math.max(170 - (pt.val / maxVal) * 130, 30),
  }));

  const svgPathD = timeRange === 'thisMonth'
    ? `M 400 ${calculatedPoints[0].y}`
    : calculatedPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');

  const svgAreaD = timeRange === 'thisMonth'
    ? `M 380 ${calculatedPoints[0].y} L 420 ${calculatedPoints[0].y} L 420 190 L 380 190 Z`
    : `${svgPathD} L 750 190 L 50 190 Z`;

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#3B1E12] flex flex-col justify-between font-sans">
      {/* MENGGUNAKAN KOMPONEN REUSABLE ADMIN HEADER */}
      <AdminHeader activeTab="analisis" />

      <main className="max-w-7xl mx-auto my-8 px-6 w-full flex-grow">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#2C1810]">Analisis Peringatan Dini</h1>
            <p className="text-xs text-stone-600 mt-1">
              Pantau dan analisis indikator peringatan dini lonjakan aktivitas perjudian di berbagai domain terindikasi.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
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

        <div className="mb-8">
          <h2 className="text-base font-extrabold text-[#2C1810] mb-3">Tren indikasi</h2>
          <div className="bg-[#FAF5EE] p-6 rounded-2xl border border-[#E2D7C7] shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-bold text-sm text-[#2C1810]">
                  Tren Indikasi Sepanjang Waktu
                </h3>
                <p className="text-[11px] text-stone-500">
                  Pantauan fluktuasi skor anomali sinyal peringatan dini ({timeRange === 'thisMonth' ? 'Bulan Ini' : 'Juni – November 2026'})
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

            <div className="relative w-full h-64 my-4">
              <svg viewBox="0 0 800 200" className="w-full h-full overflow-visible">
                <line x1="0" y1="20" x2="800" y2="20" stroke="#E2D7C7" strokeDasharray="4 4" />
                <line x1="0" y1="70" x2="800" y2="70" stroke="#E2D7C7" strokeDasharray="4 4" />
                <line x1="0" y1="120" x2="800" y2="120" stroke="#E2D7C7" strokeDasharray="4 4" />
                <line x1="0" y1="170" x2="800" y2="170" stroke="#E2D7C7" strokeDasharray="4 4" />

                <text x="-15" y="24" className="text-[10px] fill-stone-500 font-mono font-bold">{maxVal}</text>
                <text x="-15" y="74" className="text-[10px] fill-stone-500 font-mono font-bold">{Math.round(maxVal * 0.75)}</text>
                <text x="-15" y="124" className="text-[10px] fill-stone-500 font-mono font-bold">{Math.round(maxVal * 0.5)}</text>
                <text x="-15" y="174" className="text-[10px] fill-stone-500 font-mono font-bold">{Math.round(maxVal * 0.25)}</text>
                <text x="-15" y="198" className="text-[10px] fill-stone-500 font-mono font-bold">0</text>

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
                  Kurva anomali agregat domain
                </span>
                <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold text-[10px]">
                  Model AI Terkalibrasi Aktif
                </span>
              </div>
              <p>Pembaruan sistem terakhir: <span className="font-bold text-[#2C1810]">Hari ini, 14:30 WIB</span></p>
            </div>
          </div>
        </div>

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
                <button className="px-3 py-1.5 rounded-full border border-stone-300 bg-[#FAF5EE] hover:bg-stone-50 text-stone-600 transition disabled:opacity-50 font-bold">
                  Sebelumnya
                </button>
                <button className="w-7 h-7 rounded-full bg-[#3B1E12] text-white font-black text-xs flex items-center justify-center shadow-xs">
                  1
                </button>
                <button className="px-3 py-1.5 rounded-full border border-stone-300 bg-[#FAF5EE] hover:bg-stone-50 text-stone-600 transition font-bold">
                  Selanjutnya
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MENGGUNAKAN KOMPONEN REUSABLE ADMIN FOOTER */}
      <AdminFooter />
    </div>
  );
}