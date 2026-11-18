'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface AdminHeaderProps {
  activeTab?: 'beranda' | 'analisis' | 'feedback';
}

export default function AdminHeader({ activeTab = 'beranda' }: AdminHeaderProps) {
  return (
    <div className="px-6 pt-4">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center px-8 py-3 bg-[#F7F2EB] rounded-full shadow-sm gap-4">
        <Link href="/admin" className="flex items-center gap-3">
          <Image src="/logo.png" alt="GambleWatch Logo" width={36} height={36} className="object-contain" />
          <div>
            <span className="font-black text-xl tracking-wider text-[#3B1E12] block leading-none">
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
            href="/admin/hasil-klasifikasi" 
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all ${activeTab === 'analisis' ? 'bg-[#F7F2EB] font-black border border-stone-300' : 'opacity-70 hover:opacity-100'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Hasil klasifikasi
          </Link>

          <Link 
            href="/admin/feedback" 
            className={`flex items-center gap-1.5 px-3 py-1.5 transition-all ${activeTab === 'feedback' ? 'font-black opacity-100' : 'opacity-70 hover:opacity-100'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Umpan balik
          </Link>
        </nav>

        <div className="w-[180px] hidden md:block"></div>
      </header>
    </div>
  );
}