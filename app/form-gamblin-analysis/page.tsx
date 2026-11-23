'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import PublicHeader from '@/components/PublicHeader';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/client';
import { toLaporanFields, type DetectionSummary } from '@/lib/detection/analysis';
import { validateReportUrl } from '@/lib/detection/url';
import { Upload, Search, RotateCw } from 'lucide-react';

// Screenshot halaman dari hasil pemindaian link (base64) -> berkas untuk Supabase Storage
function screenshotFromScan(summary: DetectionSummary): File | null {
  const data = summary.scan?.screenshot_base64;
  if (!data || summary.scan?.screenshot_source !== 'halaman') return null;
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
  return new File([bytes], `halaman.${isPng ? 'png' : 'jpg'}`, { type: isPng ? 'image/png' : 'image/jpeg' });
}

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
    const urlError = validateReportUrl(url);
    if (urlError) {
      setErrorMessage(urlError);
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      // 1. Mesin deteksi: bila ada URL, layanan membuka link-nya lalu menilai URL,
      //    isi teks halaman, dan screenshot halaman (DET-01..04). Lihat app/api/analyze.
      const body = new FormData();
      if (url.trim()) body.set('url', url.trim());
      if (file) body.set('screenshot', file);
      const response = await fetch('/api/analyze', { method: 'POST', body });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        setErrorMessage(result?.message ?? 'Gagal melakukan analisis. Silakan coba beberapa saat lagi.');
        return;
      }
      const summary = result.summary as DetectionSummary;

      // 2. Bukti gambar: unggahan pengguna, atau screenshot halaman yang dipindai
      let publicImageUrl: string | null = null;
      const evidence = file ?? screenshotFromScan(summary);
      if (evidence) {
        const fileExt = evidence.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from('bukti-analisis')
          .upload(fileName, evidence);

        if (!uploadErr) {
          const { data: publicUrlData } = supabase.storage
            .from('bukti-analisis')
            .getPublicUrl(fileName);
          publicImageUrl = publicUrlData.publicUrl;
        }
      }

      // 3. Simpan laporan dengan hasil deteksi asli (risiko, skor, temuan, bukti_deteksi)
      const { data: insertedData, error: dbErr } = await supabase
        .from('laporan_analisis')
        .insert({
          url_situs: url.trim() || 'Hanya Unggahan Gambar',
          bukti_screenshot: publicImageUrl,
          status: 'DRAFT',
          ...toLaporanFields(summary),
        })
        .select('id')
        .single();

      if (dbErr) throw dbErr;

      router.push(`/form-gamblin-analysis/result?id=${insertedData.id}`);
    } catch (err) {
      console.error('Error scanning:', err);
      setErrorMessage('Gagal melakukan analisis. Silakan coba beberapa saat lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#3B1E12] flex flex-col justify-between font-sans">
      {/* Reusable Public Header */}
      <PublicHeader activeTab="analysis" />

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
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="https://contoh-situs.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-5 py-3.5 bg-white border border-[#E2D7C7] rounded-full text-xs text-[#2C1810] focus:outline-none focus:border-stone-400 font-medium shadow-2xs text-center"
              />
              <p className="text-[10px] text-stone-400 text-center mt-2">
                ⓘ Masukkan link lengkap diawali https:// (contoh: https://contoh-situs.com). Sistem akan membuka link dan memeriksa isinya; proses membutuhkan waktu 10-30 detik.
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

      {/* Reusable Public Footer */}
      <PublicFooter />
    </div>
  );
}