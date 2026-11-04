'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('beranda');

  // Stat Cards Data
  const stats = [
    {
      title: 'Total laporan',
      value: '1,247',
      subtitle: 'Laporan yang diterima',
      icon: (
        <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      title: 'Situs berisiko tinggi',
      value: '89',
      subtitle: 'Perlu perhatian khusus',
      icon: (
        <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      title: 'Menunggu tinjauan',
      value: '34',
      subtitle: 'Dalam antrean verifikasi',
      icon: (
        <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: 'Situs diblokir',
      value: '156',
      subtitle: 'Pemblokiran dilakukan',
      icon: (
        <svg className="w-4 h-4 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      )
    },
    {
      title: 'Scraping aktif',
      value: '12',
      subtitle: 'Pekerjaan pengumpulan data',
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
      href: '/admin/classification',
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

  // Bar Chart Data
  const chartData = [
    { month: 'Jan', height: '28%' },
    { month: 'Feb', height: '48%' },
    { month: 'Mar', height: '58%' },
    { month: 'Apr', height: '72%' },
    { month: 'Mei', height: '62%' },
    { month: 'Jun', height: '82%' },
    { month: 'Jul', height: '92%' },
  ];

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
                  <h3 className="font-extrabold text-sm text-[#2C1810]">Peringatan: Lonjakan Deteksi Tinggi</h3>
                  <span className="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                    Perlu tindakan
                  </span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Terdeteksi peningkatan 42% aktivitas perjudian ilegal dalam 24 jam terakhir di 3 domain. Tindakan segera diperlukan.
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
                <p className="text-[11px] text-stone-500">Periode Januari – Juli</p>
              </div>
              <span className="text-xs text-stone-600 font-medium">Deteksi situs</span>
            </div>

            {/* Bar Chart Graphics */}
            <div className="h-52 flex items-end justify-between gap-4 pt-8 px-6 border-b-2 border-[#3B1E12] relative">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-stone-400 py-2">
                <div className="border-b border-stone-300 border-dashed w-full flex items-center justify-start"><span className="-ml-8">180</span></div>
                <div className="border-b border-stone-300 border-dashed w-full flex items-center justify-start"><span className="-ml-8">120</span></div>
                <div className="border-b border-stone-300 border-dashed w-full flex items-center justify-start"><span className="-ml-8">60</span></div>
                <div className="border-b border-stone-300 border-dashed w-full flex items-center justify-start"><span className="-ml-8">0</span></div>
              </div>

              {chartData.map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center h-full justify-end z-10">
                  <div 
                    className="w-full max-w-[42px] bg-[#3B1E12] rounded-t-sm hover:bg-[#28130a] transition-all shadow-xs" 
                    style={{ height: item.height }}
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