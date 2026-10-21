'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function FormGamblingAnalysisPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleScan = () => {
    setLoading(true);
    setTimeout(() => {
      router.push('/form-gamblin-analysis/result');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#3B1E12] flex flex-col justify-between font-sans">
      <div className="px-6 pt-4">
        <header className="max-w-7xl mx-auto flex justify-between items-center px-8 py-3 bg-[#F7F2EB] rounded-full shadow-sm">
          {/* Klik Logo balik ke Landing Page / Home */}
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="GambleWatch Logo" width={36} height={36} className="object-contain" />
            <span className="font-black text-xl tracking-wider text-[#3B1E12]" style={{ fontFamily: 'var(--font-holtwood), serif' }}>
              GAMBLEWATCH
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 bg-white/70 px-8 py-2 rounded-full text-xs font-black tracking-wider uppercase text-[#3B1E12]">
            <Link href="/" className="opacity-70 hover:opacity-100 transition-opacity">
              HOME
            </Link>
            <Link href="/form-gamblin-analysis" className="border-b-2 border-[#3B1E12] pb-0.5">
              GAMBLING ANALYSIS
            </Link>
            <a href="#" className="opacity-70 hover:opacity-100 transition-opacity">
              FEEDBACK
            </a>
          </nav>

          <button className="bg-[#3B1E12] text-white px-6 py-2.5 rounded-full font-black text-xs tracking-wider uppercase">
            MY ANALYSES
          </button>
        </header>
      </div>

      <main className="max-w-3xl mx-auto my-8 px-4 w-full flex-grow flex flex-col items-center text-center">
        <div className="mb-4 p-3 bg-[#3B1E12] rounded-2xl shadow-md">
          <Image src="/logo.png" alt="Shield Badge" width={32} height={32} className="object-contain" />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-3 text-[#2C1810]">
          Analisis Situs Terindikasi
        </h1>
        <p className="text-xs md:text-sm text-stone-600 mb-8 max-w-xl leading-relaxed">
          Masukkan URL atau unggah tangkapan layar untuk memindai indikasi aktivitas perjudian ilegal.
          Sistem akan melakukan klasifikasi awal berdasarkan kemiripan visual dan analisis teks.
        </p>

        <div className="w-full bg-[#FAF5EE] p-8 md:p-10 rounded-3xl border border-[#E2D7C7] shadow-sm text-center">
          <label className="block text-xs font-black tracking-widest mb-3 uppercase text-[#3B1E12]">
            INPUT URL
          </label>
          <div className="relative mb-2">
            <input
              type="text"
              placeholder="http://slot-xxx-00-xxxxx.xyz"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full py-3.5 px-6 bg-white rounded-full border border-stone-300 text-stone-700 placeholder-stone-400 focus:outline-none text-sm shadow-inner"
            />
          </div>
          <p className="text-[11px] text-stone-500 mb-6">
            ⓘ Proses pemindaian URL membutuhkan waktu 10-30 detik.
          </p>

          <div className="flex items-center justify-center gap-4 my-6">
            <hr className="w-1/3 border-stone-300" />
            <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">DAN</span>
            <hr className="w-1/3 border-stone-300" />
          </div>

          <label className="block text-xs font-black tracking-widest mb-4 uppercase text-[#3B1E12]">
            UNGGAH BUKTI VISUAL
          </label>
          <div className="border-2 border-dashed border-stone-400 rounded-2xl p-8 bg-[#FAF5EE] flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-[#EFE6D8] rounded-full flex items-center justify-center mb-3 text-stone-600 shadow-sm">
              📄
            </div>
            <p className="font-bold text-sm text-[#3B1E12] mb-1">Tarik & Lepas gambar di sini</p>
            <p className="text-xs text-stone-500 mb-5">Mendukung JPG, PNG (Max 5MB)</p>
            <label className="cursor-pointer bg-white border border-stone-400 text-[#3B1E12] px-6 py-2.5 rounded-full font-black text-xs shadow-sm uppercase tracking-wider">
              PILIH FILE
              <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" />
            </label>
            {file && <p className="text-xs text-emerald-700 font-medium mt-3">File: {file.name}</p>}
          </div>
        </div>

        <div className="w-full flex justify-end mt-6">
          <button
            onClick={handleScan}
            disabled={loading}
            className="bg-[#3B1E12] text-white font-black text-xs tracking-wider px-9 py-3.5 rounded-full hover:bg-[#28130a] transition-all shadow-md uppercase"
          >
            {loading ? 'MEMINDAI...' : 'SCAN'}
          </button>
        </div>
      </main>

      <footer className="mt-12 bg-[#F7F2EB] rounded-t-3xl px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-stone-600 font-medium">
          <p>© 2026 Kementerian Komunikasi dan Digital (KOMDIGI)</p>
          <div className="flex items-center gap-6">
            <a href="#">About Web</a>
            <a href="#">Privacy Policy</a>
            <a href="#" className="bg-white border border-stone-300 text-stone-800 px-5 py-2 rounded-full font-semibold shadow-sm">
              Contact Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}