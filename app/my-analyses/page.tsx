"use client";

import React, { useState, useEffect } from "react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

export default function MyAnalysesPage() {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalyses() {
      try {
        const response = await fetch("/api/my-analyses");
        const result = await response.json();
        if (result.success) {
          setAnalyses(result.data);
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
    <div className="min-h-screen bg-[#FFFDF9] text-[#3B1E12] flex flex-col justify-between font-sans">
      <PublicHeader activeTab="analysis" />

      <main className="max-w-4xl w-full mx-auto px-6 py-10 flex-1">
        <h1 className="text-3xl font-extrabold text-[#2C1810] mb-1">
          My Analyses
        </h1>
        <p className="text-sm text-[#7A6E6B] mb-6">
          Daftar situs yang telah Anda laporkan untuk analisis.
        </p>

        <hr className="border-[#E2D7C7] mb-8" />

        {loading ? (
          <div className="text-center py-12 text-[#7A6E6B]">
            Memuat data riwayat...
          </div>
        ) : analyses.length === 0 ? (
          <div className="text-center py-16 bg-[#FAF5EE] rounded-2xl border border-[#E2D7C7]">
            <p className="text-lg font-medium text-[#7A6E6B]">
              Belum ada riwayat analisis
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {analyses.map((item) => {
              const isExpanded = expandedId === item.id;
              const formattedDate = new Date(item.created_at)
                .toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
                .toUpperCase();

              return (
                <div key={item.id} className="space-y-3">
                  <div
                    data-testid="analysis-item"
                    className="bg-[#FAF5EE] border border-[#E2D7C7] rounded-2xl p-5 flex items-center justify-between shadow-sm"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center space-x-4 text-xs font-bold tracking-wider">
                        <span className="text-[#6B5E5B]">{formattedDate}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-black ${
                            item.risk_level === "HIGH" || item.risk_level === "HIGH RISK"
                              ? "text-[#A82121]"
                              : item.risk_level === "MEDIUM" || item.risk_level === "MEDIUM RISK"
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
                        className="text-base font-bold text-[#2C1810]"
                      >
                        {item.site_url}
                      </div>
                    </div>

                    <button
                      onClick={() => toggleDetail(item.id)}
                      className="bg-white hover:bg-stone-100 text-[#3B1E12] border border-[#E2D7C7] px-6 py-2 rounded-full text-xs font-bold transition"
                    >
                      {isExpanded ? "Tutup" : "Detail"}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="bg-[#FAF5EE] border border-[#E2D7C7] rounded-2xl p-6 shadow-inner grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-extrabold uppercase text-[#7A6E6B] tracking-wider mb-1">
                            URL LINK
                          </h4>
                          <p className="font-bold text-[#2C1810] break-all">
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
                                    className="w-28 h-20 object-cover rounded border border-[#E2D7C7]"
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
                          <p className="font-bold text-[#2C1810]">
                            {item.hasil_analisis || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-extrabold uppercase text-[#7A6E6B] tracking-wider mb-1">
                            URL PATTERN ANALYSIS
                          </h4>
                          <p className="font-bold text-[#2C1810]">
                            {item.url_pattern_analysis || "-"}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-extrabold uppercase text-[#7A6E6B] tracking-wider mb-1">
                            VISUAL SIMILARITY
                          </h4>
                          <p className="font-bold text-[#2C1810]">
                            {item.visual_similarity || "-"}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-extrabold uppercase text-[#7A6E6B] tracking-wider mb-1">
                            IMAGE TO TEXT ANALYSIS
                          </h4>
                          <p className="font-bold text-[#2C1810]">
                            {item.image_to_text_analysis || "-"}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-extrabold uppercase text-[#7A6E6B] tracking-wider mb-1">
                            KEYWORD ANALYSIS
                          </h4>
                          <p className="font-bold text-[#2C1810]">
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

        {!loading && analyses.length > 0 && (
          <div className="mt-8 flex items-center justify-between text-xs text-[#7A6E6B] font-medium">
            <span>Menampilkan 1 - {analyses.length} Laporan</span>
            <div className="flex items-center space-x-1">
              <button className="px-3 py-1.5 border border-[#E2D7C7] rounded bg-[#FAF5EE] hover:bg-stone-200">
                Prev
              </button>
              <button className="px-3 py-1.5 bg-[#3B1E12] text-white font-bold rounded">
                1
              </button>
              <button className="px-3 py-1.5 border border-[#E2D7C7] rounded bg-[#FAF5EE] hover:bg-stone-200">
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}