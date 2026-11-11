'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  AlertTriangle,
  Globe,
  Calendar,
  ExternalLink,
  RotateCw,
  Zap,
  Activity,
  ShieldAlert
} from 'lucide-react';

function DetailContent() {
  const params = useParams();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [detailData, setDetailData] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      try {
        if (id) {
          const { data, error } = await supabase
            .from('laporan_analisis')
            .select('*')
            .eq('id', id)
            .single();

          if (!error && data) {
            setDetailData(data);
          }
        }
      } catch (err) {
        console.error('Error fetching detail from Supabase:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [id, supabase]);

  // Data murni dari tabel laporan_analisis Supabase (tanpa dummy fallback)
  const domainUrl = detailData?.url_situs || detailData?.domain || '-';
  const riskLevel = detailData?.tingkat_risiko || '-';
  const indicationCategory = detailData?.kategori_indikasi || detailData?.jenis_pelanggaran || '-';
  const description = detailData?.alasan_indikasi || detailData?.catatan || 'Belum ada catatan analisis dari sistem untuk laporan ini.';
  
  // Tanggal riil dari kolom created_at Supabase
  const dateDetected = detailData?.created_at 
    ? new Date(detailData.created_at).toLocaleString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).replace(/\./g, ':')
    : '-';

  // Skor anomali riil dari database (jika null, tampilkan '-')
  const scoreRisk = detailData?.skor_anomali !== undefined && detailData?.skor_anomali !== null
    ? detailData.skor_anomali 
    : '-';

  return (
    <main className="max-w-5xl mx-auto my-8 px-6 w-full flex-grow">
      {/* Kembali ke Halaman EWR */}
      <Link
        href="/admin/early-warning"
        className="inline-flex items-center gap-2 text-xs font-bold text-stone-600 hover:text-[#3B1E12] mb-6 transition-all"
      >
        <ArrowLeft className="w-4 h-4" /> Kembali ke Analisis Peringatan Dini
      </Link>

      {loading ? (
        <div className="text-center py-16 text-xs font-bold text-stone-500 flex items-center justify-center gap-2">
          <RotateCw className="w-5 h-5 animate-spin text-[#3B1E12]" /> Memuat data riil dari Supabase...
        </div>
      ) : !detailData ? (
        <div className="bg-[#FAF5EE] p-8 rounded-2xl border border-[#E2D7C7] text-center text-xs text-stone-600">
          Data sinyal dengan ID #{id} tidak ditemukan di database Supabase.
        </div>
      ) : (
        <>
          {/* Header Domain & Status Sinyal */}
          <div className="bg-[#FAF5EE] p-6 rounded-2xl border border-[#E2D7C7] shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-0.5 rounded-full text-[10px] font-extrabold border ${
                  // Data baru memakai HIGH; label lama "HIGH RISK" tetap dikenali
                  riskLevel === 'HIGH' || riskLevel === 'HIGH RISK' || riskLevel === 'BLOCKED'
                    ? 'bg-rose-100 text-rose-800 border-rose-200' 
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}>
                  {riskLevel}
                </span>
                <span className="text-xs font-mono text-stone-500 font-medium">ID Sinyal: #{id}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-[#2C1810] font-mono flex items-center gap-2">
                <Globe className="w-6 h-6 text-amber-800" />
                {domainUrl}
              </h1>
            </div>

            {/* Tombol Aksi */}
            <div className="flex items-center gap-2.5">
              {domainUrl !== '-' && (
                <a
                  href={domainUrl.startsWith('http') ? domainUrl : `http://${domainUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white border border-stone-300 text-[#3B1E12] px-4 py-2 rounded-full font-bold text-xs hover:bg-stone-50 transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  Inspeksi Situs <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {/* Tombol Mengarahkan ke Modul Pemblokiran Tim Lain */}
              <Link
                href={`/admin/block-status/${id}`}
                className="bg-[#3B1E12] text-white hover:bg-[#28130a] px-4 py-2 rounded-full font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Proses Pemblokiran ↗
              </Link>
            </div>
          </div>

          {/* Rincian Detail Anomali Sinyal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-[#FAF5EE] p-6 rounded-2xl border border-[#E2D7C7] shadow-sm">
                <h2 className="text-sm font-extrabold text-[#2C1810] mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  Rincian Sinyal Anomali Early Warning
                </h2>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="text-stone-500 font-medium block mb-1">Kategori Pola Indikasi</label>
                    <p className="font-bold text-[#2C1810] text-sm">{indicationCategory}</p>
                  </div>

                  <div>
                    <label className="text-stone-500 font-medium block mb-1">Hasil Deteksi & Analisis Sinyal</label>
                    <p className="text-stone-700 leading-relaxed bg-white p-4 rounded-xl border border-stone-200 font-medium">
                      {description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-stone-500 font-medium block mb-1">Waktu Peringatan Terpicu</label>
                      <p className="font-mono font-bold text-[#2C1810] flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-stone-500" />
                        {dateDetected}
                      </p>
                    </div>
                    <div>
                      <label className="text-stone-500 font-medium block mb-1">Status Risiko Sinyal</label>
                      <span className="inline-block px-3 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 font-bold text-[10px]">
                        {riskLevel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Indikator Teknis */}
              <div className="bg-[#FAF5EE] p-6 rounded-2xl border border-[#E2D7C7] shadow-sm">
                <h2 className="text-sm font-extrabold text-[#2C1810] mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-stone-700" />
                  Indikator Sinyal Teknis Riil
                </h2>
                <div className="space-y-2 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-stone-200 flex justify-between items-center">
                    <span className="text-stone-700 font-medium">Tingkat Evaluasi Risiko</span>
                    <span className="font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                      {riskLevel}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-stone-200 flex justify-between items-center">
                    <span className="text-stone-700 font-medium">Kategori Sistem</span>
                    <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      {indicationCategory}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Skor Anomali Murni Database */}
            <div className="space-y-6">
              <div className="bg-[#FAF5EE] p-6 rounded-2xl border border-[#E2D7C7] shadow-sm text-center">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-5 h-5" />
                </div>
                <h2 className="text-xs font-extrabold text-stone-500 uppercase tracking-wider mb-2">
                  SKOR SINYAL ANOMALI RISK
                </h2>
                <div className="my-3">
                  <span className="text-5xl font-black text-[#3B1E12] font-mono">
                    {scoreRisk}
                  </span>
                  {scoreRisk !== '-' && <span className="text-stone-400 font-bold text-sm">/100</span>}
                </div>
                <p className="text-[11px] text-stone-600 font-medium leading-relaxed">
                  Skor hasil perhitungan sinyal deteksi dari database Supabase.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

export default function DetailEarlyWarningPage() {
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
            <Link href="/admin" className="px-4 py-1.5 rounded-full opacity-70 hover:opacity-100 transition-all">
              Beranda
            </Link>
            <Link href="/admin/early-warning" className="px-4 py-1.5 rounded-full bg-[#F7F2EB] font-black border border-stone-300">
              Analisis perjudian
            </Link>
            <Link href="/admin/feedback" className="opacity-70 hover:opacity-100 transition-opacity px-3 py-1.5">
              Umpan balik
            </Link>
          </nav>

          <button className="bg-[#3B1E12] text-white px-6 py-2.5 rounded-full font-black text-xs tracking-wider uppercase">
            Analisis saya
          </button>
        </header>
      </div>

      {/* Suspense wrapper */}
      <Suspense fallback={
        <div className="text-center py-16 text-xs font-bold text-stone-500 flex items-center justify-center gap-2">
          <RotateCw className="w-5 h-5 animate-spin text-[#3B1E12]" /> Memuat modul...
        </div>
      }>
        <DetailContent />
      </Suspense>

      {/* Footer Container */}
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