'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Upload, Search, RotateCw } from 'lucide-react';

export default function GamblingAnalysisFormPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() && !file) {
      setErrorMessage('Masukkan URL atau unggah tangkapan layar terlebih dahulu.');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      let publicImageUrl = null;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('bukti-analisis')
          .upload(fileName, file);

        if (!uploadErr) {
          const { data: publicUrlData } = supabase.storage
            .from('bukti-analisis')
            .getPublicUrl(fileName);
          publicImageUrl = publicUrlData.publicUrl;
        }
      }

      const isHighRisk = url.toLowerCase().includes('slot') || 
                         url.toLowerCase().includes('gacor') || 
                         url.toLowerCase().includes('judi') || 
                         url.toLowerCase().includes('bet');
                         
      const riskLevel = isHighRisk ? 'HIGH RISK' : 'LOW RISK';
      const scoreProb = isHighRisk ? 95 : 10;
      const keywords = isHighRisk ? 'slot, gacor, judi' : '-';
      const patternDesc = isHighRisk 
        ? `High Risk (${scoreProb}%): Gambling keyword in domain detected` 
        : 'Low Risk: Domain disinyalir aman';

      const { data: insertedData, error: dbErr } = await supabase
        .from('laporan_analisis')
        .insert({
          url_situs: url.trim() || 'Hanya Unggahan Gambar',
          bukti_screenshot: publicImageUrl,
          tingkat_risiko: riskLevel,
          skor_probabilitas: scoreProb,
          keywords_found: keywords,
          url_pattern_analysis: patternDesc,
          status: 'DRAFT',
        })
        .select('id')
        .single();

      if (dbErr) throw dbErr;

      router.push(`/form-gamblin-analysis/result?id=${insertedData.id}`);
    } catch (err: any) {
      console.error('Error scanning:', err);
      setErrorMessage('Gagal melakukan analisis. Silakan coba beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#3B1E12] flex flex-col justify-between font-sans">
      {/* Top Header Navbar Publik Masyarakat (Sesuai Desain Asli) */}
      <div className="px-6 pt-4">
        <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center px-8 py-3 bg-[#F7F2EB] rounded-full shadow-sm gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="GambleWatch Logo" width={32} height={32} className="object-contain" />
            <span className="font-black text-xl tracking-wider text-[#3B1E12]">
              GAMBLEWATCH
            </span>
          </Link>

          <nav className="flex items-center gap-6 bg-white/80 px-6 py-2 rounded-full text-xs font-bold text-[#3B1E12] border border-stone-200">
            <Link href="/" className="opacity-70 hover:opacity-100 transition-all uppercase tracking-wider">
              HOME
            </Link>
            <Link href="/form-gamblin-analysis" className="font-black border-b-2 border-[#3B1E12] pb-0.5 uppercase tracking-wider">
              GAMBLING ANALYSIS
            </Link>
            <Link href="/feedback" className="opacity-70 hover:opacity-100 transition-opacity uppercase tracking-wider">
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

      {/* Main Content Form */}
      <main className="max-w-3xl mx-auto my-6 px-6 w-full flex-grow flex flex-col justify-center">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-[#2C1810] mb-2">Form Analisis Situs</h1>
          <p className="text-xs text-stone-600 max-w-lg mx-auto leading-relaxed">
            Masukkan URL atau unggah tangkapan layar untuk memindai indikasi perjudian ilegal. Sistem akan melakukan klasifikasi otomatis.
          </p>
        </div>

        <div className="bg-[#FAF5EE] p-8 rounded-3xl border border-[#E2D7C7] shadow-sm">
          <form onSubmit={handleScan} className="space-y-6">
            <div>
              <label className="block text-center font-extrabold text-xs tracking-wider uppercase text-[#2C1810] mb-3">
                INPUT URL
              </label>
              <input
                type="text"
                placeholder="https://contoh-situs.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-5 py-3.5 bg-white border border-[#E2D7C7] rounded-full text-xs text-[#2C1810] focus:outline-none focus:border-stone-400 font-medium shadow-2xs text-center"
              />
              <p className="text-[10px] text-stone-400 text-center mt-2">
                ⓘ Proses pemindaian URL membutuhkan waktu 10-30 detik.
              </p>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#E2D7C7]"></div>
              <span className="flex-shrink mx-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                DAN / ATAU
              </span>
              <div className="flex-grow border-t border-[#E2D7C7]"></div>
            </div>

            <div>
              <label className="block text-center font-extrabold text-xs tracking-wider uppercase text-[#2C1810] mb-3">
                UNGGAH BUKTI VISUAL
              </label>
              <div className="border-2 border-dashed border-stone-300 rounded-2xl p-6 text-center bg-white/40 hover:bg-white transition-all">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mb-2">
                    <Upload className="w-5 h-5 text-stone-600" />
                  </div>
                  <span className="text-xs font-bold text-[#2C1810] block mb-1">
                    {file ? file.name : 'Tarik & Lepas gambar di sini'}
                  </span>
                  <span className="text-[10px] text-stone-400 mb-3 block">Mendukung JPG, PNG (Max 5MB)</span>
                  <span className="inline-block bg-white border border-stone-300 text-[#3B1E12] px-5 py-1.5 rounded-full font-bold text-[11px] shadow-2xs hover:bg-stone-50">
                    PILIH FILE
                  </span>
                </label>
              </div>
            </div>

            {errorMessage && (
              <p className="text-xs text-rose-600 font-bold text-center bg-rose-50 p-3 rounded-xl border border-rose-200">
                {errorMessage}
              </p>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-[#3B1E12] text-white hover:bg-[#28130a] px-8 py-3 rounded-full font-black text-xs tracking-wider uppercase flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all"
              >
                {loading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" /> MEMINDAI...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" /> SCAN
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      <footer className="mt-8 bg-[#F7F2EB] rounded-t-3xl px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-stone-600 font-medium">
          <p>© 2026 Kementerian Komunikasi dan Digital (KOMDIGI). Hak cipta dilindungi.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-stone-900 transition-colors">Tentang web</a>
            <a href="#" className="hover:text-stone-900 transition-colors">Kebijakan privasi</a>
          </div>
        </div>
      </footer>
    </div>
  );
}