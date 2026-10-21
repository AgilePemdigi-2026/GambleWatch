"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase"; // Sesuaikan dengan path file firebase.ts kamu
import { doc, getDoc, updateDoc } from "firebase/firestore";

interface DetailReport {
  id: string;
  situsUrl: string;
  dilaporkanOleh: string;
  klasifikasi: "HIGH" | "MEDIUM" | "LOW" | "PENDING";
  tanggalDeteksi: string;
  polaUrlMatch?: string;
  visualSimilarity?: string;
  kataKunciOcr?: string;
  screenshotUrl?: string;
  catatanAdmin?: string;
}

function DetailVerifikasiContent() {
  const params = useParams();
  const reportId = params?.id as string;
  const router = useRouter();

  const [report, setReport] = useState<DetailReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [keputusan, setKeputusan] = useState<"TERVERIFIKASI" | "DITOLAK">("TERVERIFIKASI");
  const [catatan, setCatatan] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // 1. Fetch Detail Laporan Berdasarkan ID dari Firestore
  useEffect(() => {
    if (!reportId) return;

    const fetchDetail = async () => {
      try {
        const docRef = doc(db, "laporan_masyarakat", reportId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setReport({
            id: docSnap.id,
            situsUrl: data.situsUrl || data.url || "-",
            dilaporkanOleh: data.dilaporkanOleh || data.pelapor || "Anonim",
            klasifikasi: data.klasifikasi || data.statusRisiko || "PENDING",
            tanggalDeteksi: data.tanggalDeteksi || "-",
            polaUrlMatch: data.polaUrlMatch || "98% Match",
            visualSimilarity: data.visualSimilarity || "85% Match",
            kataKunciOcr: data.kataKunciOcr || "Tergolong Judi",
            screenshotUrl: data.screenshotUrl || "",
            catatanAdmin: data.catatanAdmin || "",
          });
          if (data.catatanAdmin) setCatatan(data.catatanAdmin);
        } else {
          console.error("Dokumen tidak ditemukan!");
        }
      } catch (error) {
        console.error("Error fetching detail:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [reportId]);

  // 2. Simpan/Update Keputusan Verifikasi ke Firestore
  const handleSimpan = async () => {
    if (!reportId) return;
    setIsSaving(true);

    try {
      const docRef = doc(db, "laporan_masyarakat", reportId);
      await updateDoc(docRef, {
        statusVerifikasi: keputusan,
        catatanAdmin: catatan,
        updatedAt: new Date(),
      });

      alert(`Keputusan untuk ID ${reportId} berhasil disimpan!`);
      router.push("/admin/hasil-klasifikasi");
    } catch (error) {
      console.error("Gagal menyimpan keputusan:", error);
      alert("Gagal menyimpan keputusan ke Firestore.");
    } finally {
      setIsSaving(false);
    }
  };

  const getBadgeStyle = (status?: string) => {
    switch (status) {
      case "HIGH":
        return "bg-[#3D0C02] text-white";
      case "MEDIUM":
        return "bg-[#C48C46] text-white";
      case "LOW":
        return "bg-[#6A8259] text-white";
      default:
        return "bg-gray-400 text-white";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF9F5] flex items-center justify-center text-xs text-gray-500 font-medium">
        Memuat detail data laporan dari Firestore...
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
              <Image
                src="/logo.png"
                alt="Logo GambleWatch"
                fill
                className="object-contain"
                priority
              />
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
            <Link href="#" className="px-4 py-1.5 text-gray-600 hover:text-black flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Beranda
            </Link>
            <Link href="/admin/hasil-klasifikasi" className="bg-white text-[#2C221E] px-4 py-1.5 rounded-full font-bold shadow-xs">
              Hasil Klasifikasi
            </Link>
            <Link href="#" className="px-4 py-1.5 text-gray-600 hover:text-black">
              Umpan Balik
            </Link>
          </nav>

          <button className="bg-[#4A2E18] hover:bg-[#382212] text-white text-xs px-5 py-2 rounded-full font-semibold flex items-center gap-2 transition">
            <svg className="w-3.5 h-3.5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Analisis Saya
          </button>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="mb-6">
            <Link
              href="/admin/hasil-klasifikasi"
              className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-black transition"
            >
              <span>&larr;</span> Kembali ke Daftar Hasil Klasifikasi
            </Link>
          </div>

          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A]">
                Lembar Kerja Verifikasi Laporan
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                ID Laporan: <span className="font-bold text-gray-800">{reportId}</span>
              </p>
            </div>
            <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wider ${getBadgeStyle(report?.klasifikasi)}`}>
              RISIKO {report?.klasifikasi || "PENDING"}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Kolom Kiri: Detail & Bukti Visual */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#F5F2EA] p-5 rounded-2xl border border-[#EBE6DA]">
                <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-4">
                  Informasi Situs & Pelapor
                </h2>
                <div className="bg-white p-4 rounded-xl border border-[#EFECE6] space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">URL Situs</span>
                    <span className="font-bold text-gray-900">{report?.situsUrl}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Dilaporkan Oleh</span>
                    <span className="font-medium text-gray-800">{report?.dilaporkanOleh}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-500 font-medium">Tanggal Deteksi</span>
                    <span className="font-medium text-gray-800">{report?.tanggalDeteksi}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#F5F2EA] p-5 rounded-2xl border border-[#EBE6DA]">
                <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-4">
                  Bukti Tangkapan Layar Situs
                </h2>
                <div className="bg-white p-4 rounded-xl border border-[#EFECE6] flex flex-col items-center justify-center min-h-[220px] text-gray-400">
                  {report?.screenshotUrl ? (
                    <div className="relative w-full h-56">
                      <Image
                        src={report.screenshotUrl}
                        alt="Screenshot Bukti"
                        fill
                        className="object-contain rounded-lg"
                      />
                    </div>
                  ) : (
                    <>
                      <svg className="w-12 h-12 mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-medium">Preview Screenshot Situs Tersimpan</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Parameter & Form Keputusan */}
            <div className="space-y-6">
              <div className="bg-[#F5F2EA] p-5 rounded-2xl border border-[#EBE6DA]">
                <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-4">
                  Parameter Deteksi AI
                </h2>
                <div className="space-y-2.5 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-[#EFECE6] flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Pola URL (Pattern)</span>
                    <span className="font-bold text-[#3D0C02]">{report?.polaUrlMatch}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#EFECE6] flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Visual Similarity</span>
                    <span className="font-bold text-[#C48C46]">{report?.visualSimilarity}</span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#EFECE6] flex justify-between items-center">
                    <span className="text-gray-600 font-medium">Kata Kunci OCR</span>
                    <span className="font-bold text-[#3D0C02]">{report?.kataKunciOcr}</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#F5F2EA] p-5 rounded-2xl border border-[#EBE6DA]">
                <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-4">
                  Keputusan Verifikator
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-2">
                      STATUS KEPUTUSAN
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setKeputusan("TERVERIFIKASI")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                          keputusan === "TERVERIFIKASI"
                            ? "bg-[#3D0C02] text-white"
                            : "bg-white text-gray-600 border border-gray-200"
                        }`}
                      >
                        Verifikasi
                      </button>
                      <button
                        type="button"
                        onClick={() => setKeputusan("DITOLAK")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                          keputusan === "DITOLAK"
                            ? "bg-gray-700 text-white"
                            : "bg-white text-gray-600 border border-gray-200"
                        }`}
                      >
                        Tolak
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1.5">
                      CATATAN / ALASAN
                    </label>
                    <textarea
                      rows={3}
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      placeholder="Masukkan catatan verifikasi atau alasan penolakan..."
                      className="w-full bg-white border border-[#EFECE6] rounded-xl p-3 text-xs focus:outline-none text-gray-700 placeholder-gray-400 resize-none"
                    />
                  </div>

                  <button
                    onClick={handleSimpan}
                    disabled={isSaving}
                    className="w-full bg-[#4A2E18] hover:bg-[#382212] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-xs transition cursor-pointer shadow-xs"
                  >
                    {isSaving ? "Menyimpan..." : "Simpan Keputusan"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <footer className="bg-white border-t border-[#EFECE6] px-10 py-4 text-xs text-gray-500 flex justify-between items-center mt-8">
        <div>© 2026 Kementerian Komunikasi dan Digital (KOMDIGI)</div>
        <div className="flex items-center gap-6">
          <Link href="#" className="hover:underline">Tentang web</Link>
          <Link href="#" className="hover:underline">Kebijakan privasi</Link>
          <Link href="#" className="border border-gray-300 px-4 py-1.5 rounded-full hover:bg-gray-50 flex items-center gap-1.5 font-medium text-gray-700">
            <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Hubungi dukungan
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default function DetailVerifikasiPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-gray-500">Memuat detail laporan...</div>}>
      <DetailVerifikasiContent />
    </Suspense>
  );
}