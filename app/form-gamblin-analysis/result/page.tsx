'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PublicHeader from '@/components/PublicHeader';
import PublicFooter from '@/components/PublicFooter';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';

function ResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const analysisId = searchParams.get('id') || '1';

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  // State untuk Kontrol Pop-Up Modal
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'CONFIRM_DISCARD' | 'SUCCESS_SUBMIT' | 'SUCCESS_DISCARD' | 'ERROR';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'CONFIRM_DISCARD',
    title: '',
    message: '',
  });

  useEffect(() => {
    async function fetchAnalysisResult() {
      setLoading(true);
      
      const supabase = createClient();
      
      const { data: result, error } = await supabase
        .from('laporan_analisis')
        .select('*')
        .eq('id', analysisId)
        .single();

      if (error) {
        console.error('Fetch error:', error);
      } else if (result) {
        setData(result);
      }
      setLoading(false);
    }

    fetchAnalysisResult();
  }, [analysisId]);

  // AKSI 1: Simpan laporan dan kirim ke Admin (Update status DRAFT -> SUBMITTED)
  const handleSaveToAdmin = async () => {
    setActionLoading(true);
    const supabase = createClient();

    const { data: updatedRows, error } = await supabase
      .from('laporan_analisis')
      .update({ status: 'SUBMITTED' })
      .eq('id', analysisId)
      .select();

    setActionLoading(false);

    if (error) {
      console.error('Update Error:', error);
      setModalState({
        isOpen: true,
        type: 'ERROR',
        title: 'Gagal Menyimpan',
        message: `Terjadi kesalahan: ${error.message}`,
      });
    } else {
      if (updatedRows && updatedRows.length > 0) {
        setData(updatedRows[0]);
      } else if (data) {
        setData({ ...data, status: 'SUBMITTED' });
      }

      setModalState({
        isOpen: true,
        type: 'SUCCESS_SUBMIT',
        title: 'Berhasil Disimpan!',
        message: 'Laporan analisis berhasil disimpan dan dikirimkan ke administrator sistem.',
      });
    }
  };

  // Trigger Pop-Up Konfirmasi Hapus
  const triggerDiscardConfirm = () => {
    setModalState({
      isOpen: true,
      type: 'CONFIRM_DISCARD',
      title: 'Buang Analisis?',
      message: 'Apakah Anda yakin ingin membuang data hasil analisis ini dari sistem?',
    });
  };

  // AKSI 2: Eksekusi Hapus dari Supabase
  const executeDiscard = async () => {
    setActionLoading(true);
    setModalState((prev) => ({ ...prev, isOpen: false }));

    const supabase = createClient();
    const { error } = await supabase
      .from('laporan_analisis')
      .delete()
      .eq('id', analysisId);

    setActionLoading(false);

    if (error) {
      console.error('Delete Error:', error);
      setModalState({
        isOpen: true,
        type: 'ERROR',
        title: 'Gagal Menghapus',
        message: `Terjadi kesalahan saat menghapus: ${error.message}`,
      });
    } else {
      setModalState({
        isOpen: true,
        type: 'SUCCESS_DISCARD',
        title: 'Analisis Dibuang',
        message: 'Data analisis telah berhasil dihapus dari sistem.',
      });
    }
  };

  const closeModal = () => {
    const currentType = modalState.type;
    setModalState((prev) => ({ ...prev, isOpen: false }));
    
    // Redirect setelah sukses simpan atau buang
    if (currentType === 'SUCCESS_SUBMIT' || currentType === 'SUCCESS_DISCARD') {
      router.push('/form-gamblin-analysis');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center text-[#3B1E12]">
        <p className="font-bold text-sm animate-pulse">Memuat Hasil Analisis...</p>
      </div>
    );
  }

  const isPending = data?.tingkat_risiko === 'PENDING';
  const riskLevel = data?.tingkat_risiko || 'PENDING';

  const probability = isPending 
    ? 'Proses Pemindaian...' 
    : (typeof data?.skor_probabilitas === 'number'
        ? `${Math.round(data.skor_probabilitas)}% Probability`
        : '0% Probability');

  const urlPattern = data?.url_pattern_analysis || (isPending ? 'Memproses...' : 'Clean / No Pattern');
  const visualSim = data?.visual_similarity || (isPending ? 'Memproses...' : '00% Match');
  const ocrStatus = data?.ocr_flagged ? 'OCR Flagged' : (isPending ? 'Memproses...' : 'Clean / Clear');
  const keywords = data?.keywords_found || (isPending ? 'Memproses...' : 'Keywords Found: None');

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-[#3B1E12] flex flex-col justify-between font-sans relative">
      <PublicHeader activeTab="analysis" />

<<<<<<< HEAD
          <nav className="hidden md:flex items-center gap-8 bg-white/70 px-8 py-2 rounded-full text-xs font-black tracking-wider uppercase text-[#3B1E12]">
            <Link href="/" className="opacity-70 hover:opacity-100 transition-opacity">HOME</Link>
            <Link href="/form-gamblin-analysis" className="border-b-2 border-[#3B1E12] pb-0.5">GAMBLING ANALYSIS</Link>
            <a href="#" className="opacity-70 hover:opacity-100 transition-opacity">FEEDBACK</a>
          </nav>

          <Link href="/my-analyses">
            <button className="bg-[#3B1E12] text-white px-6 py-2.5 rounded-full font-black text-xs tracking-wider uppercase">
              MY ANALYSES
            </button>
          </Link>
        </header>
      </div>

      {/* Main Content */}
=======
>>>>>>> 9ad9938 (refactor: standardize public & admin layout with reusable header/footer, custom modals, and route fixes)
      <main className="max-w-4xl mx-auto my-8 px-4 w-full flex-grow">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-extrabold text-[#2C1810]">Analysis Results</h1>
        </div>
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs text-stone-500">Analisis ID:</span>
          <span className="bg-stone-200 text-stone-700 text-xs font-mono px-2 py-0.5 rounded">
            {data?.id ? `ID-${data.id}` : 'ID-Unknown'}
          </span>
          <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
            Status DB: {data?.status || 'UNKNOWN'}
          </span>
        </div>

        <hr className="border-stone-300 mb-8" />

        <div className="bg-[#FAF5EE] p-8 rounded-2xl border border-stone-200 text-center mb-8 shadow-sm">
          <p className="text-[11px] font-extrabold tracking-widest text-stone-500 uppercase mb-3">
            CLASSIFICATION STATUS
          </p>
          <div className="flex items-center justify-center gap-2 text-2xl font-black text-[#2C1810] mb-2">
            <span>{isPending ? '⏳' : '⚠️'}</span>
            <span>{riskLevel}</span>
          </div>
          <h2 className="text-2xl font-black text-[#3B1E12] mb-3">
            {probability}
          </h2>
          <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
            URL <span className="font-semibold">{data?.url_situs || 'situs'}</span> menunjukkan indikasi yang telah dianalisis oleh sistem.
          </p>
        </div>

        <h2 className="text-lg font-bold text-[#2C1810] mb-4">Parameter Breakdown</h2>
        <hr className="border-stone-300 mb-6" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-[#FAF5EE] p-5 rounded-2xl border border-stone-200 flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black tracking-wider uppercase text-stone-500 mb-1">URL PATTERN ANALYSIS</p>
              <p className="text-base font-bold text-[#2C1810]">{urlPattern}</p>
            </div>
            <span className="text-stone-600">🔗</span>
          </div>

          <div className="bg-[#FAF5EE] p-5 rounded-2xl border border-stone-200 flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black tracking-wider uppercase text-stone-500 mb-1">VISUAL SIMILARITY</p>
              <p className="text-base font-bold text-[#2C1810]">{visualSim}</p>
            </div>
            <span className="text-stone-600">🖼️</span>
          </div>

          <div className="bg-[#FAF5EE] p-5 rounded-2xl border border-stone-200 flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black tracking-wider uppercase text-stone-500 mb-1">IMAGE -&gt; TEXT ANALYSIS</p>
              <p className="text-base font-bold text-[#2C1810]">{ocrStatus}</p>
            </div>
            <span className="text-stone-600">📑</span>
          </div>

          <div className="bg-[#FAF5EE] p-5 rounded-2xl border border-stone-200 flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black tracking-wider uppercase text-stone-500 mb-1">TEXT / KEYWORD ANALYSIS</p>
              <p className="text-base font-bold text-[#2C1810]">{keywords}</p>
            </div>
            <span className="text-stone-600">🔑</span>
          </div>
        </div>

        <div className="bg-[#FAF5EE] p-6 rounded-2xl border border-stone-200 mb-8">
          <h3 className="text-base font-bold text-[#2C1810] mb-2">Pilih Tindakan</h3>
          <p className="text-xs text-stone-600 mb-6 leading-relaxed">
            Menyimpan laporan akan mencatat URL ke dalam riwayat Anda dan secara otomatis memberi tahu administrator sistem.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleSaveToAdmin}
              disabled={actionLoading || data?.status === 'SUBMITTED'}
              className="bg-[#3B1E12] text-white px-6 py-3 rounded-full font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-[#28130a] transition-all disabled:opacity-50"
            >
              {actionLoading 
                ? 'MENYIMPAN...' 
                : data?.status === 'SUBMITTED' 
                  ? '✅ REPORT SUBMITTED' 
                  : '💾 SAVE TO HISTORY & ALERT ADMIN'}
            </button>
            <button 
              onClick={triggerDiscardConfirm}
              disabled={actionLoading}
              className="bg-white border border-stone-400 text-[#3B1E12] px-6 py-3 rounded-full font-black text-xs tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-stone-50 transition-all text-center disabled:opacity-50"
            >
              {actionLoading ? 'MENGHAPUS...' : '🗑️ DISCARD ANALYSIS'}
            </button>
          </div>
        </div>
      </main>

      <PublicFooter />

      {/* POP-UP MODAL KUSTOM (Aman untuk Deploy) */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FFFDF9] border border-stone-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center flex flex-col items-center">
            
            {modalState.type === 'CONFIRM_DISCARD' && (
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
            )}

            {(modalState.type === 'SUCCESS_SUBMIT' || modalState.type === 'SUCCESS_DISCARD') && (
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            )}

            {modalState.type === 'ERROR' && (
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-700 mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
            )}

            <h3 className="text-lg font-black text-[#2C1810] mb-2">{modalState.title}</h3>
            <p className="text-xs text-stone-600 mb-6 leading-relaxed">{modalState.message}</p>

            {modalState.type === 'CONFIRM_DISCARD' ? (
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => setModalState((prev) => ({ ...prev, isOpen: false }))}
                  className="flex-1 bg-stone-200 text-stone-700 py-2.5 rounded-full text-xs font-bold hover:bg-stone-300 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={executeDiscard}
                  className="flex-1 bg-rose-600 text-white py-2.5 rounded-full text-xs font-bold hover:bg-rose-700 transition-all shadow-xs"
                >
                  Ya, Hapus
                </button>
              </div>
            ) : (
              <button
                onClick={closeModal}
                className="w-full bg-[#3B1E12] text-white py-2.5 rounded-full text-xs font-bold hover:bg-[#28130a] transition-all shadow-xs"
              >
                OK
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultGamblingAnalysisPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center text-[#3B1E12]">
        <p className="font-bold text-sm animate-pulse">Loading Result Page...</p>
      </div>
    }>
      <ResultContent />
    </Suspense>
  );
}