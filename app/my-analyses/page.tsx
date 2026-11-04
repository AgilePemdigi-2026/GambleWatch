"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function MyAnalysesPage() {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch data dari API Route Back End
  useEffect(() => {
    async function fetchAnalyses() {
      try {
        const response = await fetch("/api/my-analyses");
        const result = await response.json();
        if (result.success) {
          setAnalyses(result.data);
          // Auto-expand item pertama jika ada data
          if (result.data.length > 0) {
            setExpandedId(result.data[0].id);
          }
        }
      } catch (error) {
        console.error("Gagal mengambil riwayat analisis:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAnalyses();
  }, []);

  const toggleDetail = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[#F7F4EB] text-[#4A3E3D] flex flex-col justify-between font-sans">
      {/* Header / Navbar */}
      <header className="px-8 py-4 flex items-center justify-between border-b border-[#E5DFD3] bg-[#F7F4EB]">
        <div className="flex items-center space-x-3">
          <img
            src="/logo.png"
            alt="GambleWatch Logo"
            className="w-8 h-8 object-contain"
          />
          <span className="font-extrabold text-xl tracking-wider text-[#3B2D2C]">
            GAMBLEWATCH
          </span>
        </div>

        <nav className="flex items-center space-x-8 bg-[#EFEBE0] px-6 py-2 rounded-full text-sm font-semibold">
          <Link href="/" className="hover:text-black">
            HOME
          </Link>
          <Link href="/gambling-analysis" className="hover:text-black">
            GAMBLING ANALYSIS
          </Link>
          <Link href="/feedback" className="hover:text-black">
            FEEDBACK
          </Link>
        </nav>

        <button className="bg-[#4A2E19] text-white px-5 py-2 rounded-full text-sm font-bold tracking-wide">
          MY ANALYSES
        </button>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl w-full mx-auto px-6 py-10 flex-1">
        <h1 className="text-3xl font-extrabold text-[#3B2D2C] mb-1">
          My Analyses
        </h1>
        <p className="text-sm text-[#7A6E6B] mb-6">
          Daftar situs yang telah Anda laporkan untuk analisis.
        </p>

        <hr className="border-[#E5DFD3] mb-8" />

        {/* Handling Indikator Loading */}
        {loading ? (
          <div className="text-center py-12 text-[#7A6E6B]">
            Memuat data riwayat...
          </div>
        ) : analyses.length === 0 ? (
          /* Handling Skenario Data Kosong */
          <div className="text-center py-16 bg-[#EFEBE0] rounded-2xl border border-[#E0D9C8]">
            <p className="text-lg font-medium text-[#7A6E6B]">
              Belum ada riwayat analisis
            </p>
          </div>
        ) : (
          /* Daftar Kartu Riwayat Analisis dari Database Supabase */
          <div className="space-y-4">
            {analyses.map((item) => {
              const isExpanded = expandedId === item.id;
              // Format tanggal dari DB ke format tampilan
              const formattedDate = new Date(item.created_at)
                .toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
                .toUpperCase();

              return (
                <div key={item.id} className="space-y-3">
                  {/* Kartu Ringkasan (Gambar 3.6) */}
                  <div
                    data-testid="analysis-item"
                    className="bg-[#EFEBE0] border border-[#E0D9C8] rounded-2xl p-5 flex items-center justify-between shadow-sm"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center space-x-4 text-xs font-bold tracking-wider">
                        <span className="text-[#6B5E5B]">{formattedDate}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-black ${
                            item.risk_level === "HIGH"
                              ? "text-[#A82121]"
                              : item.risk_level === "MEDIUM"
                              ? "text-[#D97706]"
                              : "text-[#15803D]"
                          }`}
                        >
                          {item.risk_level}
                        </span>
                        <span className="text-[#4A3E3D] uppercase">
                          {item.report_status}
                        </span>
                      </div>

                      <div
                        data-testid="site-url"
                        className="text-base font-bold text-[#3B2D2C]"
                      >
                        {item.site_url}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleDetail(item.id)}
                      className="bg-[#E5DFD3] hover:bg-[#D8D0C0] text-[#3B2D2C] border border-[#C8C0B0] px-6 py-2 rounded-full text-xs font-bold transition"
                    >
                      {isExpanded ? "Tutup" : "Detail"}
                    </button>
                  </div>

                  {/* Tampilan Detail Kartu (Gambar 3.7) */}
                  {isExpanded && (
                    <div className="bg-[#EFEBE0] border border-[#E0D9C8] rounded-2xl p-6 shadow-inner grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                      {/* Sisi Kiri */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-extrabold uppercase text-[#7A6E6B] tracking-wider mb-1">
                            URL LINK
                          </h4>
                          <p className="font-bold text-[#3B2D2C] break-all">
                            {item.site_url}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-extrabold uppercase text-[#7A6E6B] tracking-wider mb-2">
                            BUKTI SCREENSHOT
                          </h4>
                          <div className="flex items-center space-x-3 overflow-x-auto">
                            {item.screenshots && item.screenshots.length > 0 ? (
                              item.screenshots.map(
                                (imgSrc: string, index: number) => (
                                  <img
                                    key={index}
                                    src={imgSrc}
                                    alt={`Bukti Screenshot ${index + 1}`}
                                    className="w-28 h-20 object-cover rounded border border-[#D8D0C0]"
                                  />
                                )
                              )
                            ) : (
                              <span className="text-[#7A6E6B] italic">
                                Tidak ada screenshot
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-extrabold uppercase text-[#7A6E6B] tracking-wider mb-1">
                            HASIL ANALISIS
                          </h4>
                          <p className="font-bold text-[#3B2D2C]">
                            {item.hasil_analisis || "-"}
                          </p>
                        </div>
                      </div>

                      {/* Sisi Kanan (Parameter Breakdown) */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-extrabold uppercase text-[#7A6E6B] tracking-wider mb-1">
                            URL PATTERN ANALYSIS
                          </h4>
                          <p className="font-bold text-[#3B2D2C]">
                            {item.url_pattern_analysis || "-"}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-extrabold uppercase text-[#7A6E6B] tracking-wider mb-1">
                            VISUAL SIMILARITY
                          </h4>
                          <p className="font-bold text-[#3B2D2C]">
                            {item.visual_similarity || "-"}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-extrabold uppercase text-[#7A6E6B] tracking-wider mb-1">
                            IMAGE TO TEXT ANALYSIS
                          </h4>
                          <p className="font-bold text-[#3B2D2C]">
                            {item.image_to_text_analysis || "-"}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-extrabold uppercase text-[#7A6E6B] tracking-wider mb-1">
                            KEYWORD ANALYSIS
                          </h4>
                          <p className="font-bold text-[#3B2D2C]">
                            {item.keyword_analysis || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Pagination */}
        {!loading && analyses.length > 0 && (
          <div className="mt-8 flex items-center justify-between text-xs text-[#7A6E6B] font-medium">
            <span>Menampilkan 1 - {analyses.length} Laporan</span>
            <div className="flex items-center space-x-1">
              <button className="px-3 py-1.5 border border-[#D8D0C0] rounded bg-[#EFEBE0] hover:bg-[#E5DFD3]">
                Prev
              </button>
              <button className="px-3 py-1.5 bg-[#4A2E19] text-white font-bold rounded">
                1
              </button>
              <button className="px-3 py-1.5 border border-[#D8D0C0] rounded bg-[#EFEBE0] hover:bg-[#E5DFD3]">
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer Komdigi */}
      <footer className="px-8 py-4 border-t border-[#E5DFD3] bg-[#EFEBE0] flex items-center justify-between text-xs text-[#7A6E6B]">
        <span>© 2026 Kementerian Komunikasi dan Digital (KOMDIGI)</span>
        <div className="flex space-x-6 items-center">
          <a href="#" className="hover:underline">
            About Web
          </a>
          <a href="#" className="hover:underline">
            Privacy Policy
          </a>
          <a
            href="#"
            className="bg-white border border-[#D8D0C0] px-4 py-1 rounded-full text-[#3B2D2C] font-semibold"
          >
            Contact Support
          </a>
        </div>
      </footer>
    </div>
  );
}