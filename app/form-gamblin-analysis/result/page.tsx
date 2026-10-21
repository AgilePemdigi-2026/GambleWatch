'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function ResultGamblingAnalysisPage() {
  const analysisResult = {
    id: 'ABX-0230-X',
    riskLevel: 'HIGH RISK',
    probability: '97%',
    description: 'URL yang dikirimkan menunjukkan indikasi kuat yang konsisten dengan platform perjudian ilegal. Tindakan segera disarankan.',
    urlPattern: 'High Risk Pattern',
    visualSimilarity: '00% Match',
    ocrStatus: 'OCR Flagged',
    keywordsFound: 'Keywords Found: 000, 363, 875'
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#3B1E12] flex flex-col justify-between font-sans">
      <div className="px-6 pt-4">
        <header className="max-w-7xl mx-auto flex justify-between items-center px-8 py-3 bg-[#F7F2EB] rounded-full shadow-sm">
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

      <main className="max-w-4xl mx-auto my-8 px-4 w-full flex-grow">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-extrabold text-[#2C1810]">Analysis Results</h1>
        </div>
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs text-stone-500">Analisis ID:</span>
          <span className="bg-stone-200 text-stone-700 text-xs font-mono px-2 py-0.5 rounded">
            {analysisResult.id}
          </span>
        </div>

        <hr className="border-stone-300 mb-8" />

        <div className="bg-[#FAF5EE] p-8 rounded-2xl border border-stone-200 text-center mb-8 shadow-sm">
          <p className="text-[11px] font-extrabold tracking-widest text-stone-500 uppercase mb-3">
            CLASSIFICATION STATUS
          </p>
          <div className="flex items-center justify-center gap-2 text-2xl font-black text-[#2C1810] mb-2">
            <span>⚠️</span>
            <span>{analysisResult.riskLevel}</span>
          </div>
          <h2 className="text-2xl font-black text-[#3B1E12] mb-3">
            {analysisResult.probability} Probability
          </h2>
          <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
            {analysisResult.description}
          </p>
        </div>

        <h2 className="text-lg font-bold text-[#2C1810] mb-4">Parameter Breakdown</h2>
        <hr className="border-stone-300 mb-6" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-[#FAF5EE] p-5 rounded-2xl border border-stone-200 flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black tracking-wider uppercase text-stone-500 mb-1">
                URL PATTERN ANALYSIS
              </p>
              <p className="text-base font-bold text-[#2C1810]">{analysisResult.urlPattern}</p>
            </div>
            <span className="text-stone-600">🔗</span>
          </div>

          <div className="bg-[#FAF5EE] p-5 rounded-2xl border border-stone-200 flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black tracking-wider uppercase text-stone-500 mb-1">
                VISUAL SIMILARITY
              </p>
              <p className="text-base font-bold text-[#2C1810]">{analysisResult.visualSimilarity}</p>
            </div>
            <span className="text-stone-600">🖼️</span>
          </div>

          <div className="bg-[#FAF5EE] p-5 rounded-2xl border border-stone-200 flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black tracking-wider uppercase text-stone-500 mb-1">
                IMAGE -&gt; TEXT ANALYSIS
              </p>
              <p className="text-base font-bold text-[#2C1810]">{analysisResult.ocrStatus}</p>
            </div>
            <span className="text-stone-600">📑</span>
          </div>

          <div className="bg-[#FAF5EE] p-5 rounded-2xl border border-stone-200 flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black tracking-wider uppercase text-stone-500 mb-1">
                TEXT / KEYWORD ANALYSIS
              </p>
              <p className="text-base font-bold text-[#2C1810]">{analysisResult.keywordsFound}</p>
            </div>
            <span className="text-stone-600">🔑</span>
          </div>
        </div>

        <hr className="border-stone-300 mb-8" />

        <div className="bg-[#FAF5EE] p-6 rounded-2xl border border-stone-200 mb-8">
          <h3 className="text-base font-bold text-[#2C1810] mb-2">Pilih Tindakan</h3>
          <p className="text-xs text-stone-600 mb-6 leading-relaxed">
            Menyimpan laporan akan mencatat URL ke dalam riwayat Anda dan secara otomatis memberi tahu administrator sistem karena terdeteksi berisiko tinggi. Menghapus laporan akan menghapus hasil analisis dari sesi ini tanpa menyimpannya.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button className="bg-[#3B1E12] text-white px-6 py-3 rounded-full font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-[#28130a] transition-all">
              💾 SAVE TO HISTORY & ALERT ADMIN
            </button>
            <Link 
              href="/form-gamblin-analysis" 
              className="bg-white border border-stone-400 text-[#3B1E12] px-6 py-3 rounded-full font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-stone-50 transition-all text-center"
            >
              🗑️ DISCARD ANALYSIS
            </Link>
          </div>
        </div>
      </main>

      <footer className="bg-[#F7F2EB] rounded-t-3xl px-8 py-6">
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