"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface DetailReport {
  idTiket: string;
  prioritas: string;
  domainUrl: string;
  skorProbabilitas: number;
  risiko: "HIGH" | "MEDIUM" | "LOW" | "PENDING";
  pelapor: string;
  waktuDeteksi: string;
  alamatIp: string;
  metodeTemuan: string;
  screenshotUrl?: string;
  snippets?: Array<{ teks: string; dom: string; kategori: string; highlight?: string }>;
}

function DetailVerifikasiContent() {
  const params = useParams();
  const reportId = params?.id as string;
  const router = useRouter();

  const [report, setReport] = useState<DetailReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusRegulasi, setStatusRegulasi] = useState("Menunggu Verifikasi (Pending)");
  const [nomorSurat, setNomorSurat] = useState("KOMDIGI/DIT-APT/VI/2026/8912");
  const [catatan, setCatatan] = useState("");
  const [distribusiAutomatic, setDistribusiAutomatic] = useState(true);
  const [simpanArsip, setSimpanArsip] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 1. Fetch Detail Laporan Berdasarkan ID dari Supabase
  useEffect(() => {
    if (!reportId) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const numericId = parseInt(reportId, 10);
        
        // Menggunakan .maybeSingle() agar aman & tidak melempar error crash saat ID tidak ada
        const { data, error } = await supabase
          .from("laporan_analisis")
          .select("*")
          .eq("id", isNaN(numericId) ? 0 : numericId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching detail dari Supabase:", error.message);
        } else if (data) {
          setReport({
            idTiket: `#GW-2026-${String(data.id).padStart(4, "0")}`,
            prioritas: data.tingkat_risiko === "HIGH" ? "PRIORITAS TINGGI (P1)" : "PRIORITAS SEDANG (P2)",
            domainUrl: data.url_situs || data.domain_url || "http://slot-xxx-00-xxxxx.xyz",
            skorProbabilitas: data.skor_probabilitas || 87,
            risiko: data.tingkat_risiko || "HIGH",
            pelapor: data.pelapor || (data.user_id ? `User (${data.user_id.slice(0, 8)})` : "user_anon_01"),
            waktuDeteksi: data.created_at ? new Date(data.created_at).toLocaleString("id-ID") : "15 Juli 2026, 14:32:08 WIB",
            alamatIp: data.ip_address || "104.21.49.182 (Cloudflare, Inc. SG)",
            metodeTemuan: data.metode_temuan || "Deep Scraper AI Model v4.2 NLP-ID",
            screenshotUrl: data.bukti_screenshot || "",
            snippets: data.flagged_snippets || [
              {
                teks: "Daftar sekarang dan dapatkan bonus 100% member baru tanpa potongan langsung cair!",
                dom: "<h1>.promo-title",
                kategori: "Promosi Deposit",
                highlight: "bonus 100%",
              },
              {
                teks: "Slot online terpercaya, deposit minimal 10rb via QRIS, DANA, OVO 24 jam nonstop.",
                dom: "<div>.gateway-info",
                kategori: "Transaksi Finansial",
                highlight: "Slot online terpercaya",
              },
              {
                teks: "Menang jutaan rupiah setiap hari dengan pola maxwin gacor rtp live 98.8%.",
                dom: "<span>.ticker-item",
                kategori: "Janji Kemenangan",
                highlight: "Menang jutaan rupiah setiap hari",
              },
            ],
          });

          if (data.status) setStatusRegulasi(data.status);
          if (data.catatan_admin) setCatatan(data.catatan_admin);
        } else {
          // Fallback UI data jika ID belum ada di database
          setReport({
            idTiket: `#GW-2026-${reportId}`,
            prioritas: "PRIORITAS TINGGI (P1)",
            domainUrl: "http://slot-xxx-00-xxxxx.xyz",
            skorProbabilitas: 87,
            risiko: "HIGH",
            pelapor: "user_anon_01",
            waktuDeteksi: "15 Juli 2026, 14:32:08 WIB",
            alamatIp: "104.21.49.182 (Cloudflare, Inc. SG)",
            metodeTemuan: "Deep Scraper AI Model v4.2 NLP-ID",
          });
        }
      } catch (error) {
        console.error("Error fetching detail:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [reportId]);

  // 2. Simpan Keputusan Regulasi ke Supabase
  const handleUpdateStatus = async () => {
    if (!reportId) return;
    setIsSaving(true);

    try {
      const numericId = parseInt(reportId, 10);
      if (!isNaN(numericId)) {
        const { error } = await supabase
          .from("laporan_analisis")
          .update({
            status: statusRegulasi,
            nomor_surat: nomorSurat,
            catatan_admin: catatan,
            distribusi_otomatis: distribusiAutomatic,
            simpan_arsip: simpanArsip,
          })
          .eq("id", numericId);

        if (error) throw error;
      }

      alert(`Status Regulasi untuk Laporan #${reportId} berhasil diperbarui!`);
      router.push("/admin/hasil-klasifikasi");
    } catch (error: any) {
      console.error("Gagal memperbarui status:", error);
      alert("Gagal memperbarui status ke Supabase: " + (error.message || error));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center text-xs text-gray-500 font-medium">
        Memuat detail verifikasi laporan...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-[#2C221E] font-sans flex flex-col justify-between">
      <div>
        {/* Navbar Admin */}
        <header className="bg-white border-b border-[#EFECE6] px-10 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 flex-shrink-0">
              <Image src="/logo.png" alt="Logo GambleWatch" fill className="object-contain" priority />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wider block leading-tight text-[#1A1A1A]">
                GAMBLEWATCH
              </span>
              <span className="text-[10px] text-gray-400 block leading-tight font-medium">
                Deteksi perjudian online ilegal
              </span>
            </div>
          </div>

          <nav className="bg-[#F6F3EC] p-1 rounded-full flex items-center gap-1 text-xs font-medium">
            <Link href="#" className="px-4 py-1.5 text-gray-600 hover:text-black">Beranda</Link>
            <Link href="/admin/hasil-klasifikasi" className="bg-white text-[#2C221E] px-4 py-1.5 rounded-full font-bold shadow-xs">
              Analisis perjudian
            </Link>
            <Link href="#" className="px-4 py-1.5 text-gray-600 hover:text-black">Umpan balik</Link>
          </nav>

          <button className="bg-[#4A2E18] hover:bg-[#382212] text-white text-xs px-5 py-2 rounded-full font-semibold">
            Analisis saya
          </button>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-6 py-8">
          {/* Top Bar / Breadcrumb */}
          <div className="flex justify-between items-center mb-6">
            <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
              <Link href="#" className="hover:underline">Beranda</Link>
              <span>&rsaquo;</span>
              <Link href="/admin/hasil-klasifikasi" className="hover:underline">Hasil Klasifikasi</Link>
              <span>&rsaquo;</span>
              <span className="font-bold text-gray-800">Tindak Lanjut & Status Pemblokiran</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-[#3D0C02] text-white text-[10px] font-bold px-3 py-1 rounded-full tracking-wider">
                {report?.prioritas}
              </span>
              <span className="text-xs font-bold text-gray-600">Tiket ID: {report?.idTiket}</span>
            </div>
          </div>

          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-xl font-bold text-[#1A1A1A]">Tindak Lanjut & Status Pemblokiran</h1>
              <p className="text-xs text-gray-500 mt-1">
                Tinjau bukti teknis, tetapkan tingkat risiko regulasi, dan perbarui status pemblokiran domain perjudian online ke ISP nasional.
              </p>
            </div>
            <button className="text-xs font-bold text-gray-600 hover:text-black border border-gray-300 px-4 py-1.5 rounded-full bg-white flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Riwayat Audit
            </button>
          </div>

          {/* Card 1: Informasi Situs & Identitas Target */}
          <div className="bg-[#F5F2EA] p-6 rounded-2xl border border-[#EBE6DA] mb-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="text-base">🌐</span> Informasi Situs & Identitas Target
                </h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Hasil otomatis crawler GambleWatch AI Engine v4.2</p>
              </div>
              <span className="bg-[#3D0C02] text-white text-xs font-bold px-3.5 py-1 rounded-full">
                RISIKO {report?.risiko}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div className="md:col-span-2 space-y-5">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">
                    DOMAIN TERINDIKASI (SITE URL)
                  </label>
                  <div className="font-bold text-sm text-[#1A1A1A] flex items-center gap-2">
                    <span>{report?.domainUrl}</span>
                    <button className="text-gray-400 hover:text-black text-xs">📋</button>
                    <button className="text-gray-400 hover:text-black text-xs">↗</button>
                  </div>
                </div>

                {/* Bar Probabilitas */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] font-bold text-gray-600">Skor Probabilitas Judi Online</span>
                    <span className="font-bold text-[#3D0C02] text-sm">{report?.skorProbabilitas} / 100</span>
                  </div>
                  <div className="w-full bg-[#E5DFC9] h-2.5 rounded-full overflow-hidden">
                    <div className="bg-[#3D0C02] h-full rounded-full" style={{ width: `${report?.skorProbabilitas}%` }}></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1.5 font-medium">
                    <span>Rendah (0–40)</span>
                    <span>Sedang (41–70)</span>
                    <span className="font-bold text-gray-700">Tinggi (71–100)</span>
                  </div>
                </div>
              </div>

              {/* Detail Kanan */}
              <div className="space-y-3 bg-white/60 p-4 rounded-xl border border-[#EFECE6]">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Pelapor Awal</span>
                  <span className="font-bold text-gray-800">{report?.pelapor}</span>
                  <span className="text-[10px] text-gray-500 block">Warga Terverifikasi</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Waktu Deteksi</span>
                  <span className="font-medium text-gray-800">{report?.waktuDeteksi}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Alamat IP / Lokasi</span>
                  <span className="font-medium text-gray-800">{report?.alamatIp}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Metode Temuan</span>
                  <span className="font-medium text-gray-800">{report?.metodeTemuan}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Bukti & Potongan Teks Temuan */}
          <div className="bg-[#F5F2EA] p-6 rounded-2xl border border-[#EBE6DA] mb-6">
            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <span className="text-base">🛡️</span> Bukti & Potongan Teks Temuan
            </h2>
            <p className="text-[11px] text-gray-500 mb-6 mt-0.5">
              Artefak visual dan ekstraksi frasa kata kunci perjudian terlarang
            </p>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Box Bukti Screenshot */}
              <div className="md:col-span-5 bg-white p-5 rounded-xl border border-[#EFECE6] flex flex-col items-center justify-center text-center min-h-[200px]">
                {report?.screenshotUrl ? (
                  <div className="relative w-full h-48">
                    <Image src={report.screenshotUrl} alt="Screenshot Bukti" fill className="object-contain rounded-lg" />
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 mb-3 text-gray-300 flex items-center justify-center border border-gray-200 rounded-full">
                      🚫
                    </div>
                    <span className="font-bold text-xs text-gray-800">Belum Ada Tangkapan Layar</span>
                    <p className="text-[10px] text-gray-400 mt-1 mb-4">
                      Crawler sistem belum mengekstrak snapshot DOM visual secara otomatis.
                    </p>
                    <div className="flex gap-2">
                      <button className="text-[11px] font-bold border border-gray-300 px-3 py-1.5 rounded-full bg-white hover:bg-gray-50">
                        Jalankan Headless Snapshot
                      </button>
                      <button className="text-[11px] font-bold border border-gray-300 px-3 py-1.5 rounded-full bg-white hover:bg-gray-50">
                        Unggah Manual
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Box Snippets dengan Highlight */}
              <div className="md:col-span-7 space-y-3">
                <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase">
                  <span>Potongan Teks Terindikasi (Flagged Text Snippets)</span>
                  <span>{report?.snippets?.length || 0} Frasa Terdeteksi</span>
                </div>

                {report?.snippets?.map((item, idx) => (
                  <div key={idx} className="bg-white p-3.5 rounded-xl border border-[#EFECE6] text-xs space-y-1.5">
                    <p className="text-gray-800 font-medium italic">
                      &ldquo;
                      {item.highlight ? (
                        <>
                          {item.teks.split(item.highlight)[0]}
                          <mark className="bg-[#FCD34D] text-[#92400E] px-1 rounded font-bold">{item.highlight}</mark>
                          {item.teks.split(item.highlight)[1]}
                        </>
                      ) : (
                        item.teks
                      )}
                      &rdquo;
                    </p>
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono">
                      <span>DOM: {item.dom}</span>
                      <span className="font-sans text-gray-500 font-medium">Kategori: {item.kategori}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card 3: Perbarui Status & Catatan Petugas */}
          <div className="bg-[#F5F2EA] p-6 rounded-2xl border border-[#EBE6DA]">
            <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <span className="text-base">⚖️</span> Perbarui Status & Catatan Petugas
            </h2>
            <p className="text-[11px] text-gray-500 mb-6 mt-0.5">
              Tetapkan keputusan legal untuk proses pemblokiran DNS Nasional / TrustPositif
            </p>

            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5">
                    STATUS REGULASI *
                  </label>
                  <select
                    value={statusRegulasi}
                    onChange={(e) => setStatusRegulasi(e.target.value)}
                    className="w-full bg-white border border-[#EFECE6] rounded-xl px-4 py-2.5 text-xs font-medium text-gray-800 focus:outline-none cursor-pointer"
                  >
                    <option value="Menunggu Verifikasi (Pending)">Menunggu Verifikasi (Pending)</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Blocked">Blocked</option>
                    <option value="No Action Needed">No Action Needed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5">
                    NOMOR SURAT PERINTAH / TIKET TRUSTPOSITIF
                  </label>
                  <input
                    type="text"
                    value={nomorSurat}
                    onChange={(e) => setNomorSurat(e.target.value)}
                    className="w-full bg-white border border-[#EFECE6] rounded-xl px-4 py-2.5 text-xs font-mono text-gray-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1.5">
                  CATATAN TINDAK LANJUT & ALASAN VERIFIKATOR
                </label>
                <textarea
                  rows={4}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Tambahkan catatan tindak lanjut, indikasi rekening deposit penampung, koordinat hosting, atau rekomendasi teknis pemblokiran lanjutan..."
                  className="w-full bg-white border border-[#EFECE6] rounded-xl p-4 text-xs focus:outline-none text-gray-700 placeholder-gray-400 resize-none"
                />
              </div>

              {/* Checkboxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-gray-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={distribusiAutomatic}
                    onChange={(e) => setDistribusiAutomatic(e.target.checked)}
                    className="rounded border-gray-300 text-[#3D0C02] focus:ring-0"
                  />
                  <span>Distribusikan otomatis ke daftar sinkronisasi firewall ISP nasional (TrustPositif API)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={simpanArsip}
                    onChange={(e) => setSimpanArsip(e.target.checked)}
                    className="rounded border-gray-300 text-[#3D0C02] focus:ring-0"
                  />
                  <span>Simpan arsip forensic snapshot</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-[#EBE6DA]">
                <button 
                  onClick={() => router.push("/admin/hasil-klasifikasi")}
                  className="text-xs font-bold text-gray-600 hover:text-black cursor-pointer"
                >
                  Batal
                </button>
                <div className="flex gap-3">
                  <button className="text-xs font-bold border border-gray-300 px-4 py-2 rounded-full bg-white hover:bg-gray-50 cursor-pointer">
                    Kirim Sampel ke Bareskrim
                  </button>
                  <button
                    onClick={handleUpdateStatus}
                    disabled={isSaving}
                    className="text-xs font-bold bg-[#3D0C02] text-white px-5 py-2 rounded-full hover:bg-[#2A0801] transition disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? "Menyimpan..." : "Perbarui Status"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Footer Komdigi */}
      <footer className="bg-white border-t border-[#EFECE6] px-10 py-4 text-xs text-gray-500 flex justify-between items-center mt-8">
        <div>© 2026 Kementerian Komunikasi dan Digital (KOMDIGI)</div>
        <div className="flex items-center gap-6">
          <Link href="#" className="hover:underline">Tentang web</Link>
          <Link href="#" className="hover:underline">Kebijakan privasi</Link>
          <button className="border border-gray-300 px-4 py-1.5 rounded-full hover:bg-gray-50 font-medium text-gray-700 cursor-pointer">
            Hubungi dukungan
          </button>
        </div>
      </footer>
    </div>
  );
}

export default function DetailVerifikasiPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-gray-500">Memuat tampilan...</div>}>
      <DetailVerifikasiContent />
    </Suspense>
  );
}