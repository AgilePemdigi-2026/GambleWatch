'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import AdminHeader from '@/components/AdminHeader';
import AdminFooter from '@/components/AdminFooter';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  AlertTriangle,
  Globe,
  Calendar,
  ExternalLink,
  RotateCw,
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

  const domainUrl = detailData?.url_situs || detailData?.domain || '-';
  const riskLevel = detailData?.tingkat_risiko || '-';
  
  const indicationCategory = detailData?.kategori_indikasi || 
    (detailData?.keywords_found ? detailData.keywords_found : 'Pola Transaksi / Aktivitas Terindikasi');
    
  const description = detailData?.url_pattern_analysis || detailData?.alasan_indikasi || detailData?.catatan || 'Belum ada catatan analisis dari sistem untuk laporan ini.';
  
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

  const rawScore = detailData?.skor_probabilitas ?? detailData?.skor_anomali;
  const scoreRisk = rawScore !== undefined && rawScore !== null
    ? (rawScore > 1 ? Math.round(rawScore) : Math.round(rawScore * 100))
    : '-';

  return (
    <main className="max-w-5xl mx-auto my-8 px-6 w-full flex-grow">
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
          <div className="bg-[#FAF5EE] p-6 rounded-2xl border border-[#E2D7C7] shadow-sm mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-0.5 rounded-full text-[10px] font-extrabold border ${
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

              <Link
                href={`/admin/verifikasi/${id}`}
                className="bg-[#3B1E12] text-white hover:bg-[#28130a] px-4 py-2 rounded-full font-bold text-xs transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Proses Pemblokiran ↗
              </Link>
            </div>
          </div>

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

            <div className="space-y-6">
              <div className="bg-[#FAF5EE] p-6 rounded-2xl border border-[#E2D7C7] shadow-sm text-center">
                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-5 h-5" />
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
      <AdminHeader activeTab="analisis" />

      <Suspense fallback={
        <div className="text-center py-16 text-xs font-bold text-stone-500 flex items-center justify-center gap-2">
          <RotateCw className="w-5 h-5 animate-spin text-[#3B1E12]" /> Memuat modul...
        </div>
      }>
        <DetailContent />
      </Suspense>

      <AdminFooter />
    </div>
  );
}