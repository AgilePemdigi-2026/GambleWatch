'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// Baris laporan_analisis yang dipakai dashboard
interface Laporan {
  id: number;
  url_situs: string | null;
  tingkat_risiko: string | null;
  status: string | null;
  created_at: string | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAY = 24 * 60 * 60 * 1000;
// Label lama ("HIGH RISK") masih ada di beberapa baris awal
const isHigh = (r: string | null) => r === 'HIGH' || r === 'HIGH RISK';
const isIndicated = (r: string | null) => isHigh(r) || r === 'MEDIUM' || r === 'MEDIUM RISK';
// Status selesai ditangani admin (halaman Tindak Lanjut)
const DONE = new Set(['Blocked', 'No Action Needed']);

const hostOf = (url: string | null) => {
  try { return new URL(url ?? '').hostname.replace(/^www\./, ''); } catch { return url ?? ''; }
};

const fmt = (n: number) => n.toLocaleString('id-ID');

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('beranda');
  const [reports, setReports] = useState<Laporan[] | null>(null);
  // Waktu data dimuat: acuan "24 jam terakhir" dan bulan grafik (tidak dihitung saat render)
  const [loadedAt, setLoadedAt] = useState(0);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await createClient()
        .from('laporan_analisis')
        .select('id, url_situs, tingkat_risiko, status, created_at');
      if (!active) return;
      if (error) setLoadError(error.message);
      setLoadedAt(Date.now());
      setReports((data as Laporan[]) ?? []);
    })();
    return () => { active = false; };
  }, []);

  // Semua angka dihitung dari laporan_analisis; null = masih memuat
  const summary = useMemo(() => {
    if (!reports) return null;
    const now = loadedAt;
    const time = (r: Laporan) => (r.created_at ? new Date(r.created_at).getTime() : 0);
    const high = reports.filter((r) => isHigh(r.tingkat_risiko));
    const last24 = high.filter((r) => now - time(r) < DAY);
    const prev24 = high.filter((r) => now - time(r) >= DAY && now - time(r) < 2 * DAY);

    // 7 bulan terakhir, berakhir di bulan ini: situs terindikasi (Sedang + Tinggi)
    const today = new Date(loadedAt);
    const months = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - 6 + i, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
    const counts = months.map(({ year, month }) =>
      reports.filter((r) => {
        if (!r.created_at || !isIndicated(r.tingkat_risiko)) return false;
        const d = new Date(r.created_at);
        return d.getFullYear() === year && d.getMonth() === month;
      }).length,
    );
    const step = Math.max(1, Math.ceil(Math.max(...counts) / 3));

    return {
      total: reports.length,
      high: high.length,
      // DRAFT = pelapor belum mengirim ke admin; Blocked/No Action Needed = sudah diputuskan
      waiting: reports.filter((r) => r.status && r.status !== 'DRAFT' && !DONE.has(r.status)).length,
      blocked: reports.filter((r) => r.status === 'Blocked').length,
      last24: last24.length,
      prev24: prev24.length,
      domains24: new Set(last24.map((r) => hostOf(r.url_situs))).size,
      chart: months.map((m, i) => ({ month: MONTHS[m.month], count: counts[i] })),
      axisMax: step * 3,
      axis: [step * 3, step * 2, step, 0],
      period: `${MONTHS[months[0].month]} ${months[0].year} – ${MONTHS[months[6].month]} ${months[6].year}`,
    };
  }, [reports, loadedAt]);

  const value = (n: number | undefined) => (summary ? fmt(n ?? 0) : '…');

  // Stat Cards Data
  const stats = [
    {
      title: 'Total laporan',
      value: value(summary?.total),
      subtitle: 'Laporan yang diterima',
      icon: (
        <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      title: 'Situs berisiko tinggi',
      value: value(summary?.high),
      subtitle: 'Perlu perhatian khusus',
      icon: (
        <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      title: 'Menunggu tinjauan',
      value: value(summary?.waiting),
      subtitle: 'Dalam antrean verifikasi',
      icon: (
        <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: 'Situs diblokir',
      value: value(summary?.blocked),
      subtitle: 'Pemblokiran dilakukan',
      icon: (
        <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      )
    },
    {
      title: 'Scraping aktif',
      // Modul scraper belum ada (rencana sprint 3, docs/RANCANGAN_SCRAPER.md)
      value: '–',
      subtitle: 'Modul scraper belum aktif (sprint 3)',
      icon: (
        <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
  ];

  // Quick Access Routing List
  const quickAccess = [
    {
      title: 'Hasil klasifikasi',
      desc: 'Tinjau klasifikasi situs',
      href: '/admin/hasil-klasifikasi',
      icon: (
        <svg className="w-5 h-5 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    {
      title: 'Status laporan',
      desc: 'Lacak tindak lanjut',
      href: '/admin/report-status',
      icon: (
        <svg className="w-5 h-5 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      title: 'Monitor scraping',
      desc: 'Pantau pengumpulan data',
      href: '/admin/scraping',
      icon: (
        <svg className="w-5 h-5 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      title: 'Peringatan dini',
      desc: 'Periksa indikasi risiko',
      href: '/admin/early-warning',
      icon: (
        <svg className="w-5 h-5 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    },
    {
      title: 'Umpan balik',
      desc: 'Tinjau masukan publik',
      href: '/admin/feedback',
      icon: (
        <svg className="w-5 h-5 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    {
      title: 'Database kata kunci',
      desc: 'Kelola kata kunci deteksi',
      href: '/admin/keywords',
      icon: (
        <svg className="w-5 h-5 text-stone-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      )
    },
  ];

  // Bar Chart Data (tinggi batang relatif terhadap sumbu atas)
  const chartData = (summary?.chart ?? []).map((c) => ({
    month: c.month,
    count: c.count,
    height: `${summary ? (c.count / summary.axisMax) * 100 : 0}%`,
  }));

  // Banner peringatan dini: laporan berisiko tinggi 24 jam terakhir vs 24 jam sebelumnya
  const alert = (() => {
    if (!summary) return { title: 'Memuat ringkasan deteksi...', badge: '', text: '' };
    const { last24, prev24, domains24 } = summary;
    // Angka pembanding, bukan persen: dari 2 ke 72 laporan terbaca "3500%" dan menyesatkan
    const change = ` (24 jam sebelumnya: ${fmt(prev24)})`;
    return last24 > 0
      ? {
          title: last24 > prev24 ? 'Peringatan: Lonjakan Deteksi Tinggi' : 'Peringatan: Deteksi Tinggi',
          badge: 'Perlu tindakan',
          text: `Terdeteksi ${fmt(last24)} laporan berisiko tinggi dalam 24 jam terakhir dari ${fmt(domains24)} domain${change}.`,
        }
      : { title: 'Tidak ada deteksi tinggi baru', badge: 'Aman', text: 'Tidak ada laporan berisiko tinggi dalam 24 jam terakhir.' };
  })();

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
              onClick={() => setActiveTab('beranda')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all ${activeTab === 'beranda' ? 'bg-[#F7F2EB] font-black border border-stone-300' : 'opacity-70 hover:opacity-100'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Beranda
            </Link>

            <Link 
              href="/admin/gambling-analysis" 
              onClick={() => setActiveTab('analisis')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all ${activeTab === 'analisis' ? 'bg-[#F7F2EB] font-black border border-stone-300' : 'opacity-70 hover:opacity-100'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Analisis perjudian
            </Link>

            <a href="#" className="opacity-70 hover:opacity-100 transition-opacity px-3 py-1.5 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Umpan balik
            </a>
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#2C1810]">Admin Dashboard</h1>
            <p className="text-xs text-stone-600 mt-1">Pantau dan kelola seluruh aktivitas deteksi perjudian online ilegal.</p>
          </div>
          <button className="bg-white border border-stone-300 text-stone-800 px-5 py-2.5 rounded-full text-xs font-bold shadow-sm flex items-center gap-2 hover:bg-stone-50 transition-all">
            <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Ruang kerja admin
          </button>
        </div>

        {/* 5 Stat Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {stats.map((item, index) => (
            <div key={index} className="bg-[#FAF5EE] p-5 rounded-2xl border border-[#E2D7C7] shadow-sm flex flex-col justify-between h-36 hover:border-stone-400 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-stone-700">{item.title}</span>
                {item.icon}
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#2C1810] mb-1">{item.value}</h2>
                <p className="text-[10px] text-stone-500 font-medium">{item.subtitle}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Early Warning Alert Section */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-extrabold text-[#2C1810]">Peringatan dini</h2>
            <span className="text-xs text-stone-500 font-medium">Prioritas tindak lanjut</span>
          </div>

          <div className="bg-[#FAF5EE] p-6 rounded-2xl border border-[#E2D7C7] shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl border border-stone-200 text-stone-800 shadow-2xs">
                <svg className="w-6 h-6 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-extrabold text-sm text-[#2C1810]">{alert.title}</h3>
                  {alert.badge && (
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${alert.badge === 'Aman' ? 'bg-emerald-100 text-emerald-900 border-emerald-200' : 'bg-amber-100 text-amber-900 border-amber-200'}`}>
                      {alert.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {loadError ? `Gagal memuat data laporan: ${loadError}` : alert.text}
                </p>
              </div>
            </div>

            <Link 
              href="/admin/early-warning" 
              className="bg-white border border-stone-400 text-[#3B1E12] px-6 py-2.5 rounded-full font-bold text-xs hover:bg-stone-50 transition-all whitespace-nowrap shadow-xs flex items-center gap-1.5"
            >
              Lihat Detail →
            </Link>
          </div>
        </div>

        {/* Quick Access Section */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-extrabold text-[#2C1810]">Akses cepat</h2>
            <span className="text-xs text-stone-500 font-medium">Alat pengelolaan dan pemantauan</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickAccess.map((item, index) => (
              <Link 
                key={index} 
                href={item.href}
                className="bg-[#FAF5EE] p-5 rounded-2xl border border-[#E2D7C7] hover:border-stone-400 hover:shadow-md transition-all shadow-sm flex flex-col justify-between h-36 group"
              >
                <div className="flex justify-between items-start">
                  {item.icon}
                  <span className="text-stone-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform text-xs font-bold">↗</span>
                </div>
                <div>
                  <p className="font-bold text-xs text-[#2C1810] mb-1">{item.title}</p>
                  <p className="text-[10px] text-stone-500 leading-tight">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Detection Trend Chart */}
        <div className="mb-8">
          <h2 className="text-base font-extrabold text-[#2C1810] mb-3">Tren deteksi</h2>
          <div className="bg-[#FAF5EE] p-6 rounded-2xl border border-[#E2D7C7] shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-sm text-[#2C1810]">Jumlah deteksi per bulan</h3>
                <p className="text-[11px] text-stone-500">Periode {summary?.period ?? '…'}</p>
              </div>
              <span className="text-xs text-stone-600 font-medium">Situs terindikasi (Sedang + Tinggi)</span>
            </div>

            {/* Bar Chart Graphics */}
            <div className="h-52 flex items-end justify-between gap-4 pt-8 px-6 border-b-2 border-[#3B1E12] relative">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-stone-400 py-2">
                {(summary?.axis ?? [0, 0, 0, 0]).map((tick, i) => (
                  <div key={i} className="border-b border-stone-300 border-dashed w-full flex items-center justify-start"><span className="-ml-8">{summary ? tick : ''}</span></div>
                ))}
              </div>

              {chartData.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center h-full justify-end z-10">
                  <div
                    className="w-full max-w-[42px] bg-[#3B1E12] rounded-t-sm hover:bg-[#28130a] transition-all shadow-xs"
                    style={{ height: item.height }}
                    title={`${item.month}: ${item.count} situs terindikasi`}
                  ></div>
                  <span className="text-xs text-[#2C1810] font-bold mt-3">{item.month}</span>
                </div>
              ))}
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
            <a href="#" className="bg-white border border-stone-300 text-stone-800 px-5 py-2 rounded-full font-semibold shadow-sm hover:bg-stone-50 transition-all flex items-center gap-1.5">
              Hubungi dukungan
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}