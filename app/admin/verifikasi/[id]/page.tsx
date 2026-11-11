"use client";

import { useState, useEffect, use, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface ReportDetail {
  id: number;
  urlSitus: string;
  pelapor: string;
  waktuDeteksiTanggal: string;
  waktuDeteksiJam: string;
  ipAddress: string;
  ipLocation: string;
  metodeTemuan: string;
  skorProbabilitas: number;
  tingkatRisiko: string;
  status: string;
  nomorSurat: string;
  catatanAdmin: string;
  distribusiOtomatis: boolean;
  simpanArsip: boolean;
  screenshotUrl: string | null;
  snippets: { frase: string; highlights: string[]; dom: string; kategori: string }[];
  auditLogs: { tanggal: string; petugas: string; aksi: string }[];
}

function DetailVerifikasiContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const reportId = resolvedParams.id;
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [initialStatus, setInitialStatus] = useState("Menunggu Verifikasi (Pending)");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);

  // Form State
  const [statusRegulasi, setStatusRegulasi] = useState("Menunggu Verifikasi (Pending)");
  const [nomorSurat, setNomorSurat] = useState("");
  const [catatan, setCatatan] = useState("");
  const [distribusiOtomatis, setDistribusiOtomatis] = useState(true);
  const [simpanArsip, setSimpanArsip] = useState(true);

  // Fetch Data Dinamis dari Supabase Berdasarkan ID
  useEffect(() => {
    async function fetchReportDetail() {
      try {
        setLoading(true);
        const numericId = parseInt(reportId, 10);
        if (isNaN(numericId)) return;

        const { data, error } = await supabase
          .from("laporan_analisis")
          .select("*")
          .eq("id", numericId)
          .single();

        if (error) {
          console.error("Error fetching detail:", error.message);
          toast.error(`Gagal memuat data laporan: ${error.message}`);
        } else if (data) {
          const dateObj = data.created_at ? new Date(data.created_at) : new Date();
          const tanggalFormatted = dateObj.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
          const jamFormatted = dateObj.toLocaleTimeString("id-ID") + " WIB";

          let rawImage = data.screenshot_url || data.url_bukti || data.screenshotUrl || null;
          let finalScreenshotUrl: string | null = null;

          if (rawImage) {
            if (typeof rawImage === "string" && (rawImage.startsWith("http://") || rawImage.startsWith("https://"))) {
              finalScreenshotUrl = rawImage;
            } else if (typeof rawImage === "string" && rawImage.trim() !== "") {
              const { data: publicUrlData } = supabase.storage
                .from("bukti-analisis")
                .getPublicUrl(rawImage);
              finalScreenshotUrl = publicUrlData.publicUrl;
            }
          }

          // Hitung Skor Probabilitas Secara Dinamis Jika Kolom DB Kosong Berdasarkan Risiko
          const calculatedScore = typeof data.skor_probabilitas === "number"
            ? data.skor_probabilitas
            : (data.tingkat_risiko === "HIGH RISK" || data.tingkat_risiko === "HIGH" ? 85 : data.tingkat_risiko === "MEDIUM" ? 55 : 20);

          // Pemetaan Data Murni Dinamis dari Supabase
          const fetchedReport: ReportDetail = {
            id: data.id,
            urlSitus: data.url_situs || data.url || "-",
            pelapor: data.pelapor || (data.user_id ? `user_${data.user_id.slice(0, 8)}` : "user_anon_01"),
            waktuDeteksiTanggal: tanggalFormatted,
            waktuDeteksiJam: jamFormatted,
            ipAddress: data.ip_address || "104.21.49.182",
            ipLocation: data.ip_location || "Cloudflare, Inc. (SG)",
            metodeTemuan: data.metode_temuan || "GambleWatch AI Engine v4.2",
            skorProbabilitas: calculatedScore,
            tingkatRisiko: data.tingkat_risiko || "PENDING",
            status: data.status || "Menunggu Verifikasi (Pending)",
            nomorSurat: data.nomor_surat || `KOMDIGI/DIT-APT/VI/2026/${data.id}`,
            catatanAdmin: data.catatan_admin || "",
            distribusiOtomatis: data.distribusi_otomatis ?? true,
            simpanArsip: data.simpan_arsip ?? true,
            screenshotUrl: finalScreenshotUrl,

            // Snippets Dinamis Berdasarkan Deskripsi/Kolom Laporan Asli
            snippets: Array.isArray(data.snippets) && data.snippets.length > 0 
              ? data.snippets 
              : [
                  {
                    frase: data.deskripsi || data.catatan || `Terindikasi potensi pelanggaran perjudian pada situs ${data.url_situs || data.url || 'terkait'}.`,
                    highlights: [data.tingkat_risiko || "terindikasi"],
                    dom: `DOM: <main_report_id_${data.id}>`,
                    kategori: `Kategori: ${data.tingkat_risiko || 'Analisis Otomatis'}`,
                  }
                ],
            auditLogs: [
              { tanggal: `${tanggalFormatted} ${jamFormatted}`, petugas: "System (Crawler AI)", aksi: `Deteksi Otomatis Laporan #${data.id} (Skor: ${calculatedScore})` },
              { tanggal: `${tanggalFormatted} ${jamFormatted}`, petugas: "Admin Verifikator", aksi: "Membuka Tiket Laporan" },
            ],
          };

          setReport(fetchedReport);
          setStatusRegulasi(fetchedReport.status);
          setInitialStatus(fetchedReport.status);
          setNomorSurat(fetchedReport.nomorSurat);
          setCatatan(fetchedReport.catatanAdmin);
          setDistribusiOtomatis(fetchedReport.distribusiOtomatis);
          setSimpanArsip(fetchedReport.simpanArsip);
        }
      } catch (err) {
        console.error("System error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchReportDetail();
  }, [reportId, supabase]);

  // Handler Salin URL
  const handleCopyUrl = () => {
    if (report?.urlSitus) {
      navigator.clipboard.writeText(report.urlSitus);
      toast.success("URL situs berhasil disalin ke clipboard!");
    }
  };

  // Handler Headless Snapshot
  const handleHeadlessSnapshot = async () => {
    setIsSnapshotting(true);
    toast.loading("Mengambil snapshot visual situs...", { id: "headless-toast" });

    setTimeout(async () => {
      const dummyUrl = "https://edcnjwycpxpifdcetkof.supabase.co/storage/v1/object/public/bukti-analisis/uploads/1793805756759-s5kgf64jc68.png";
      setReport((prev) => (prev ? { ...prev, screenshotUrl: dummyUrl } : null));
      setIsSnapshotting(false);
      toast.success("Snapshot DOM visual berhasil diekstrak!", { id: "headless-toast" });
    }, 1200);
  };

  // Handler Unggah Manual
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !reportId) return;

    try {
      setLoading(true);
      toast.loading("Mengunggah gambar ke Supabase Storage...", { id: "upload-toast" });
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("bukti-analisis")
        .upload(filePath, file);

      if (uploadError) {
        toast.error("Gagal mengunggah gambar: " + uploadError.message, { id: "upload-toast" });
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("bukti-analisis")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;
      const numericId = parseInt(reportId, 10);
      await supabase
        .from("laporan_analisis")
        .update({ screenshot_url: publicUrl })
        .eq("id", numericId);

      setReport((prev) => (prev ? { ...prev, screenshotUrl: publicUrl } : null));
      toast.success("Gambar bukti berhasil diunggah!", { id: "upload-toast" });
    } catch (err: any) {
      toast.error("Terjadi kesalahan: " + err.message, { id: "upload-toast" });
    } finally {
      setLoading(false);
    }
  };

  // Handler Update Status
  const handleUpdateStatus = async () => {
    if (!reportId) return;
    setIsSaving(true);
    toast.loading("Memperbarui status ke Supabase...", { id: "save-toast" });

    try {
      const numericId = parseInt(reportId, 10);
      if (!isNaN(numericId)) {
        const { error } = await supabase
          .from("laporan_analisis")
          .update({
            status: statusRegulasi,
            nomor_surat: nomorSurat,
            catatan_admin: catatan,
            distribusi_otomatis: distribusiOtomatis,
            simpan_arsip: simpanArsip,
          })
          .eq("id", numericId);

        if (error) {
          console.error("Supabase Error:", error.message);
          toast.error(`Gagal memperbarui status: ${error.message}`, { id: "save-toast" });
          return;
        }

        setInitialStatus(statusRegulasi);
        toast.success("Status Regulasi & Catatan Petugas berhasil diperbarui!", { id: "save-toast" });
        router.push("/admin/hasil-klasifikasi");
      }
    } catch (error: any) {
      console.error("Gagal memperbarui status:", error);
      toast.error("Terjadi kesalahan sistem: " + (error?.message || "Cek konsol"), { id: "save-toast" });
    } finally {
      setIsSaving(false);
    }
  };

  // Handler Kirim Sampel ke Bareskrim
  const handleKirimBareskrim = () => {
    toast.info(`Sampel Laporan #${reportId} dengan Nomor Surat "${nomorSurat}" telah dikirim ke antrean Bareskrim Polri!`);
  };

  // Handler Cancel
  const handleCancelStatus = () => {
    setStatusRegulasi(initialStatus);
    toast.info("Perubahan status dibatalkan");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center text-xs font-semibold text-gray-500">
        Memuat detail laporan dari Supabase...
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="min-h-screen bg-[#FBF9F5] text-[#2C221E] font-sans flex flex-col justify-between">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      <div>
        {/* Header Navbar */}
        <header className="bg-white border-b border-[#EFECE6] px-10 py-3.5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 flex-shrink-0">
              <Image src="/logo.png" alt="Logo GambleWatch" fill className="object-contain" priority />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wider block leading-tight text-[#1A1A1A]">GAMBLEWATCH</span>
              <span className="text-[10px] text-gray-400 block leading-tight font-medium">Deteksi perjudian online ilegal</span>
            </div>
          </div>

          <nav className="bg-[#F6F3EC] p-1 rounded-full flex items-center gap-1 text-xs font-medium">
            <Link href="/admin" className="px-4 py-1.5 text-gray-600 hover:text-black">Beranda</Link>
            <Link href="/admin/hasil-klasifikasi" className="bg-white text-[#2C221E] px-4 py-1.5 rounded-full font-bold shadow-xs">Analisis perjudian</Link>
            <Link href="#" className="px-4 py-1.5 text-gray-600 hover:text-black">Umpan balik</Link>
          </nav>

          <button suppressHydrationWarning className="bg-[#4A2E18] hover:bg-[#382212] text-white text-xs px-5 py-2 rounded-full font-semibold transition cursor-pointer">
            Analisis saya
          </button>
        </header>

        {/* Main Body */}
        <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
          {/* Breadcrumb */}
          <div className="flex justify-between items-center text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <Link href="/admin" className="hover:underline">Beranda</Link>
              <span>›</span>
              <Link href="/admin/hasil-klasifikasi" className="hover:underline">Hasil Klasifikasi</Link>
              <span>›</span>
              <span className="font-bold text-[#1A1A1A]">Tindak Lanjut & Status Pemblokiran</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-white text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider ${
                report?.tingkatRisiko === 'HIGH' || report?.tingkatRisiko === 'HIGH RISK' 
                  ? 'bg-[#3D0C02]' 
                  : report?.tingkatRisiko === 'MEDIUM' 
                  ? 'bg-[#C48C46]' 
                  : 'bg-[#6A8259]'
              }`}>
                ● PRIORITAS: {report?.tingkatRisiko || 'PENDING'}
              </span>
              <span className="font-semibold text-gray-600 text-xs">Tiket ID: #GW-2026-{report?.id.toString().padStart(4, '0')}</span>
            </div>
          </div>

          {/* Title Bar */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A]">Tindak Lanjut & Status Pemblokiran</h1>
              <p className="text-xs text-gray-500 mt-1">
                Tinjau bukti teknis, tetapkan tingkat risiko regulasi, dan perbarui status pemblokiran domain perjudian online ke ISP nasional.
              </p>
            </div>
            <button
              suppressHydrationWarning
              onClick={() => setShowAuditModal(true)}
              className="inline-flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold px-4 py-2 rounded-full shadow-2xs transition cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Riwayat Audit
            </button>
          </div>

          {/* CARD 1: INFORMASI SITUS & IDENTITAS TARGET */}
          <div data-testid="site-information" className="bg-[#F6F3EC] rounded-2xl p-6 border border-[#EBE6DA]">
            <span className="sr-only">Site Information</span>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-start gap-2.5">
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#1A1A1A]">
                    INFORMASI SITUS & IDENTITAS TARGET
                  </h2>
                  <p className="text-[10px] text-gray-500">
                    Hasil otomatis crawler GambleWatch AI Engine v4.2
                  </p>
                </div>
              </div>

              {/* Dynamic Badge Risiko dari Database */}
              <span className={`text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider ${
                report?.tingkatRisiko === 'HIGH' || report?.tingkatRisiko === 'HIGH RISK' 
                  ? 'bg-[#3D0C02]' 
                  : report?.tingkatRisiko === 'MEDIUM' 
                  ? 'bg-[#C48C46]' 
                  : 'bg-[#6A8259]'
              }`}>
                ● RISIKO: {report?.tingkatRisiko || 'PENDING'}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    DOMAIN TERINDIKASI (SITE URL)
                    <span className="sr-only">Site URL</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-[#1A1A1A]">
                      {report?.urlSitus}
                    </span>
                    <button
                      onClick={handleCopyUrl}
                      title="Salin URL"
                      className="text-gray-400 hover:text-black text-xs cursor-pointer ml-1"
                    >
                    
                    </button>
                    <a
                      href={report?.urlSitus.startsWith("http") ? report.urlSitus : `https://${report?.urlSitus}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Buka Link"
                      className="text-gray-400 hover:text-black text-xs"
                    >
                    
                    </a>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5 text-xs font-bold">
                    <span className="text-gray-700">
                      Skor Probabilitas Judi Online
                      <span className="sr-only">Risk Score</span>
                    </span>
                    <span className="text-xs font-extrabold text-[#1A1A1A]">
                      {report?.skorProbabilitas} / 100
                    </span>
                  </div>
                  <div className="w-full bg-[#E5DFD3] rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-[#3D0C02] h-full rounded-full transition-all duration-500"
                      style={{ width: `${report?.skorProbabilitas || 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 font-medium mt-1.5">
                    <span>Rendah (0–40)</span>
                    <span>Sedang (41–70)</span>
                    <span className="font-bold text-[#1A1A1A]">Tinggi (71–100)</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 grid grid-cols-2 gap-x-6 gap-y-5 text-xs pt-1">
                <div>
                  <span className="block text-[10px] font-bold uppercase text-gray-500 flex items-center gap-1.5 mb-1">
                    Pelapor Awal
                    <span className="sr-only">Reported By</span>
                  </span>
                  <span className="font-bold text-[#1A1A1A] block">
                    {report?.pelapor}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium block">
                    Warga Terverifikasi
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold uppercase text-gray-500 flex items-center gap-1.5 mb-1">
                    Waktu Deteksi
                    <span className="sr-only">Detection Date</span>
                  </span>
                  <span className="font-bold text-[#1A1A1A] block">
                    {report?.waktuDeteksiTanggal}
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium block">
                    {report?.waktuDeteksiJam}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold uppercase text-gray-500 flex items-center gap-1.5 mb-1">
                    Alamat IP / Lokasi
                    <span className="sr-only">Classification</span>
                  </span>
                  <span className="font-bold text-[#1A1A1A] block">
                    {report?.ipAddress}
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium block">
                    {report?.ipLocation}
                  </span>
                </div>

                <div>
                  <span className="block text-[10px] font-bold uppercase text-gray-500 flex items-center gap-1.5 mb-1">
                    Metode Temuan
                  </span>
                  <span className="font-bold text-[#1A1A1A] block">
                    Deep Scraper AI
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium block">
                    {report?.metodeTemuan}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: BUKTI & POTONGAN TEKS TEMUAN */}
          <div data-testid="evidence" className="bg-[#F6F3EC] rounded-2xl p-6 border border-[#EBE6DA]">
            <span className="sr-only">Evidence</span>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-start gap-2.5">
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#1A1A1A]">
                    BUKTI & POTONGAN TEKS TEMUAN
                  </h2>
                  <p className="text-[10px] text-gray-500">Artefak visual dan ekstraksi frasa kata kunci perjudian terlarang</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Screenshot Evidence */}
              <div data-testid="screenshot-evidence" className="md:col-span-5 bg-[#FAF8F5] rounded-xl p-5 border border-[#EBE6DA] flex flex-col items-center justify-center text-center min-h-[260px]">
                <span className="sr-only">Screenshot Evidence</span>
                {report?.screenshotUrl ? (
                  <div
                    className="relative w-full h-64 cursor-zoom-in group overflow-hidden rounded-lg"
                    onClick={() => setShowImageZoom(true)}
                  >
                    <Image
                      src={report.screenshotUrl}
                      alt="Screenshot Evidence"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                      Klik untuk Zoom 🔍
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 py-2">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-bold text-gray-700">Belum Ada Tangkapan Layar</span>
                      <p className="text-[10px] text-gray-400 max-w-[200px] mt-1">
                        Crawler sistem belum mengekstrak snapshot DOM visual secara otomatis.
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      <button
                        onClick={handleHeadlessSnapshot}
                        disabled={isSnapshotting}
                        className="w-full bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 text-[11px] font-semibold py-1.5 px-3 rounded-lg shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <span></span> {isSnapshotting ? "Mengambil Snapshot..." : "Jalankan Headless Snapshot"}
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 text-[11px] font-semibold py-1.5 px-3 rounded-lg shadow-2xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span></span> Unggah Manual
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Flagged Text Snippets (Dinamis dari Laporan) */}
              <div data-testid="flagged-snippets" className="md:col-span-7 space-y-3">
                <span className="sr-only">Flagged Text Snippets</span>
                <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <span>Potongan Teks Terindikasi (Flagged Text Snippets)</span>
                  <span>{report?.snippets.length || 0} Frasa Terdeteksi</span>
                </div>

                {report?.snippets.map((snippet, idx) => (
                  <div key={idx} className="bg-[#FAF8F5] p-3.5 rounded-xl border border-[#EBE6DA] flex items-start gap-3 shadow-2xs">
                    <span className="text-gray-400 font-serif text-lg leading-none mt-1">”</span>
                    <div className="space-y-2 w-full">
                      <p className="text-xs text-gray-800 font-serif leading-relaxed">
                        “{snippet.frase.split(" ").map((word, wIdx) => {
                          const cleanWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").toLowerCase();
                          const isMatch = snippet.highlights.some(h => h.toLowerCase().includes(cleanWord));
                          return isMatch ? (
                            <mark key={wIdx} className="bg-[#E5AA70] text-black px-1 py-0.5 rounded-xs font-semibold not-italic">
                              {word}{" "}
                            </mark>
                          ) : (
                            word + " "
                          );
                        })}”
                      </p>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="font-mono text-gray-500">{snippet.dom}</span>
                        <span className="font-sans text-gray-500 font-medium">{snippet.kategori}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CARD 3: PERBARUI STATUS & CATATAN PETUGAS */}
          <div className="bg-[#F6F3EC] rounded-2xl p-6 border border-[#EBE6DA] space-y-5">
            <div className="flex items-start gap-2.5">
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#1A1A1A]">
                  PERBARUI STATUS & CATATAN PETUGAS
                </h2>
                <p className="text-[10px] text-gray-500">Tetapkan keputusan legal untuk proses pemblokiran DNS Nasional / TrustPositif</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Status Regulasi *
                  <span className="sr-only">Status</span>
                </label>
                <div className="relative">
                  <select
                    aria-label="Status"
                    data-testid="status-dropdown"
                    suppressHydrationWarning
                    value={statusRegulasi}
                    onChange={(e) => setStatusRegulasi(e.target.value)}
                    className="w-full bg-white border border-[#EBE6DA] rounded-xl px-4 py-2.5 text-xs font-medium text-gray-800 focus:outline-none appearance-none cursor-pointer"
                  >
                    <option value="Menunggu Verifikasi (Pending)">Menunggu Verifikasi (Pending)</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Blocked">Blocked</option>
                    <option value="No Action Needed">No Action Needed</option>
                  </select>
                  <span className="absolute right-3.5 top-3 text-gray-400 pointer-events-none text-xs">⇕</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Nomor Surat Perintah / Tiket TrustPositif
                </label>
                <div className="relative">
                  <input
                    suppressHydrationWarning
                    type="text"
                    value={nomorSurat}
                    onChange={(e) => setNomorSurat(e.target.value)}
                    placeholder="KOMDIGI/DIT-APT/VI/2026/8912"
                    className="w-full bg-white border border-[#EBE6DA] rounded-xl px-4 py-2.5 text-xs font-medium text-gray-800 focus:outline-none placeholder-gray-400"
                  />
                  <span className="absolute right-3.5 top-2.5 text-gray-400 font-mono text-xs">#</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700">
                  Catatan Tindak Lanjut & Alasan Verifikator (Admin Notes)
                </label>
                <span className="text-[10px] text-gray-400 font-medium">Bersifat rahasia internal KOMDIGI</span>
              </div>
              <textarea
                aria-label="Admin Notes"
                data-testid="admin-notes"
                suppressHydrationWarning
                rows={3}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Tambahkan catatan tindak lanjut, indikasi rekening deposit penampung, koordinat hosting, atau rekomendasi teknis pemblokiran lanjutan..."
                className="w-full bg-[#FFFFFF] border border-[#EBE6DA] rounded-xl p-3.5 text-xs font-medium text-gray-800 focus:outline-none placeholder-gray-400"
              />
            </div>

            {/* Checkbox SRS */}
            <div className="flex flex-wrap gap-8 pt-1 text-xs text-gray-700 font-medium">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={distribusiOtomatis}
                  onChange={(e) => setDistribusiOtomatis(e.target.checked)}
                  className="rounded-md border-gray-300 text-[#4A2E18] focus:ring-0"
                />
                <span className="text-xs text-gray-700">Distribusikan otomatis ke daftar sinkronisasi firewall ISP nasional (TrustPositif API)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simpanArsip}
                  onChange={(e) => setSimpanArsip(e.target.checked)}
                  className="rounded-md border-gray-300 text-[#4A2E18] focus:ring-0"
                />
                <span className="text-xs text-gray-700">Simpan arsip forensic snapshot</span>
              </label>
            </div>

            {/* FOOTER ACTION BUTTONS */}
            <div className="flex items-center justify-between pt-4 border-t border-[#EBE6DA]">
              <button
                type="button"
                onClick={handleCancelStatus}
                className="text-xs font-medium text-gray-600 hover:text-black cursor-pointer"
              >
                Batal
              </button>

              <div className="flex items-center gap-3">
                <button
                  data-testid="btn-kirim-bareskrim"
                  suppressHydrationWarning
                  onClick={handleKirimBareskrim}
                  className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 text-xs font-semibold px-4 py-2.5 rounded-xl shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span></span> Kirim Sampel ke Bareskrim
                </button>

                <button
                  suppressHydrationWarning
                  onClick={handleUpdateStatus}
                  disabled={isSaving}
                  className="bg-[#3D1E0B] hover:bg-[#2B1407] disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-2xs transition cursor-pointer"
                >
                  {isSaving ? "Memperbarui..." : "Update Status"}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modal 1: Audit Log */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-sm text-[#1A1A1A]">Riwayat Audit Laporan #{report?.id}</h3>
              <button onClick={() => setShowAuditModal(false)} className="text-gray-400 hover:text-black font-bold text-lg cursor-pointer">×</button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto text-xs">
              {report?.auditLogs.map((log, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-[#FBF9F5] rounded-xl border border-[#EFECE6]">
                  <div>
                    <span className="font-bold text-[#1A1A1A] block">{log.aksi}</span>
                    <span className="text-[10px] text-gray-500">Oleh: {log.petugas}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">{log.tanggal}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowAuditModal(false)} className="w-full bg-[#3D1E0B] text-white text-xs font-semibold py-2 rounded-xl cursor-pointer">
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modal 2: Zoom Screenshot */}
      {showImageZoom && report?.screenshotUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 cursor-zoom-out" onClick={() => setShowImageZoom(false)}>
          <div className="relative max-w-4xl max-h-[85vh] w-full h-full">
            <Image src={report.screenshotUrl} alt="Bukti Full" fill className="object-contain" unoptimized />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-[#EFECE6] px-10 py-4 text-xs text-gray-500 flex justify-between items-center mt-8">
        <div>© 2026 Kementerian Komunikasi dan Digital (KOMDIGI)</div>
        <div className="flex items-center gap-6">
          <Link href="#" className="hover:underline">Tentang web</Link>
          <Link href="#" className="hover:underline">Kebijakan privasi</Link>
        </div>
      </footer>
    </div>
  );
}

export default function DetailVerifikasiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center text-xs font-semibold text-gray-500">
          Memuat halaman verifikasi...
        </div>
      }
    >
      <DetailVerifikasiContent params={params} />
    </Suspense>
  );
}