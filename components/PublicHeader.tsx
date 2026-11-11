'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface PublicHeaderProps {
  activeTab?: 'home' | 'analysis' | 'feedback';
}

export default function PublicHeader({ activeTab = 'analysis' }: PublicHeaderProps) {
  return (
    <div className="px-6 pt-4">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center px-8 py-3 bg-[#F7F2EB] rounded-full shadow-sm gap-4">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="GambleWatch Logo" width={32} height={32} className="object-contain" />
          <span className="font-black text-xl tracking-wider text-[#3B1E12]">
            GAMBLEWATCH
          </span>
        </Link>

        <nav className="flex items-center gap-6 bg-white/80 px-6 py-2 rounded-full text-xs font-bold text-[#3B1E12] border border-stone-200">
          <Link 
            href="/" 
            className={`transition-all uppercase tracking-wider ${activeTab === 'home' ? 'font-black border-b-2 border-[#3B1E12] pb-0.5' : 'opacity-70 hover:opacity-100'}`}
          >
            HOME
          </Link>
          <Link 
            href="/form-gamblin-analysis" 
            className={`transition-all uppercase tracking-wider ${activeTab === 'analysis' ? 'font-black border-b-2 border-[#3B1E12] pb-0.5' : 'opacity-70 hover:opacity-100'}`}
          >
            GAMBLING ANALYSIS
          </Link>
          <Link 
            href="/feedback" 
            className={`transition-all uppercase tracking-wider ${activeTab === 'feedback' ? 'font-black border-b-2 border-[#3B1E12] pb-0.5' : 'opacity-70 hover:opacity-100'}`}
          >
            FEEDBACK
          </Link>
        </nav>

        <Link
          href="/my-analyses"
          className="bg-[#3B1E12] text-white px-5 py-2 rounded-full font-bold text-xs hover:bg-[#28130a] transition-all uppercase tracking-wider"
        >
          MY ANALYSES
        </Link>
      </header>
    </div>
  );
}