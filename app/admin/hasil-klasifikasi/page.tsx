"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

interface KlasifikasiItem {
  id: number;
  situsUrl: string;
  dilaporkanOleh: string;
  klasifikasi: "HIGH" | "MEDIUM" | "LOW" | "PENDING";
  tanggalDeteksi: string;
}

export default function HasilKlasifikasiPage() {
  const supabase = createClient();

  // Filter State
  const [statusRisiko, setStatusRisiko] = useState("Semua Status");
  const [rentangTanggal, setRentangTanggal] = useState("");
  const [cariUrl, setCariUrl] = useState("");

  // Data & Pagination State
  const [reports, setReports] = useState<KlasifikasiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Helper Konversi Tanggal DD/MM/YYYY ke Date Object
  const parseDDMMYYYY = (dateStr: string) => {
    const parts = dateStr.trim().split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return null;
  };

  // Fetch Data Langsung Menggunakan Query Filter & Pagination Supabase
  const fetchReportsFromSupabase = useCallback(async () => {
    try {
      setLoading(true);

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from("laporan_analisis")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // 1. Apply Filter Status Risiko
      if (statusRisiko !== "Semua Status") {
        query = query.eq("tingkat_risiko", statusRisiko);
      }

      // 2. Apply Filter Cari URL Situs (Menggunakan url_situs)
      if (cariUrl.trim() !== "") {
        query = query.ilike("url_situs", `%${cariUrl}%`);
      }

      // 3. Apply Filter Rentang Tanggal (Format: DD/MM/YYYY - DD/MM/YYYY)
      if (rentangTanggal.includes("-")) {
        const [startStr, endStr] = rentangTanggal.split("-");
        const startDate = parseDDMMYYYY(startStr);
        const endDate = parseDDMMYYYY(endStr);

        if (startDate && !isNaN(startDate.getTime())) {
          query = query.gte("created_at", startDate.toISOString());
        }

        if (endDate && !isNaN(endDate.getTime())) {
          endDate.setHours(23, 59, 59, 999);
          query = query.lte("created_at", endDate.toISOString());
        }
      }

      // 4. Apply Range Pagination
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        console.error("Error fetching Supabase data:", error.message);
      } else if (data) {
        const formattedData: KlasifikasiItem[] = data.map((item) => ({
          id: item.id,
          situsUrl: item.url_situs || "-",
          // Tanpa user_id = dikirim tanpa login; "[DATA UJI]" = contoh yang dibuat sistem
          dilaporkanOleh: item.pelapor
            || (item.user_id ? `Pengguna (${String(item.user_id).slice(0, 8)})`
              : String(item.catatan_admin ?? "").startsWith("[DATA UJI]") ? "Data uji (sistem)" : "Anonim"),
          klasifikasi: (item.tingkat_risiko as "HIGH" | "MEDIUM" | "LOW") || "PENDING",
          tanggalDeteksi: item.created_at ? new Date(item.created_at).toLocaleDateString("id-ID") : "-",
        }));

        setReports(formattedData);
        if (count !== null) setTotalCount(count);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, currentPage, statusRisiko, cariUrl, rentangTanggal]);

  useEffect(() => {
    fetchReportsFromSupabase();
  }, [fetchReportsFromSupabase]);

  const handleApplyFilter = () => {
    setCurrentPage(1); // Reset ke halaman 1 saat filter diterapkan
    fetchReportsFromSupabase();
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case "HIGH":
        return "bg-[#3D0C02] text-white";
      case "MEDIUM":
        return "bg-[#C48C46] text-white";
      case "LOW":
        return "bg-[#6A8259] text-white";
      case "PENDING":
        return "bg-[#A3A8B1] text-white";
      default:
        return "bg-gray-400 text-white";
    }
  };

  return (
    <div
      suppressHydrationWarning
      className="min-h-screen bg-[#FBF9F5] text-[#2C221E] font-sans flex flex-col justify-between"
    >
      <div>
        {/* Navbar Admin Header */}
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
            <Link href="#" className="px-4 py-1.5 text-gray-600 hover:text-black">
              Beranda
            </Link>
            <Link href="/admin/hasil-klasifikasi" className="bg-white text-[#2C221E] px-4 py-1.5 rounded-full font-bold shadow-xs">
              Analisis perjudian
            </Link>
            <Link href="#" className="px-4 py-1.5 text-gray-600 hover:text-black">
              Umpan balik
            </Link>
          </nav>

          <button
            suppressHydrationWarning
            className="bg-[#4A2E18] hover:bg-[#382212] text-white text-xs px-5 py-2 rounded-full font-semibold transition cursor-pointer"
          >
            Analisis saya
          </button>
        </header>

        {/* Content Body */}
        <main className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A]">Hasil Klasifikasi Publik</h1>
              <p className="text-xs text-gray-500 mt-1">
                Lihat dan telusuri riwayat hasil klasifikasi situs yang telah dilaporkan oleh masyarakat.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#2E7D32] bg-[#EAF5EA] px-3.5 py-1.5 rounded-full font-medium">
              <span className="w-2 h-2 rounded-full bg-[#388E3C]"></span>
              Database Terkini Terbuka (Supabase)
            </div>
          </div>

          {/* Filter Panel (1 Input Rentang Tanggal) */}
          <div className="bg-[#F5F2EA] p-5 rounded-2xl mb-6 border border-[#EBE6DA]">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  STATUS RISIKO
                </label>
                <select
                  suppressHydrationWarning
                  value={statusRisiko}
                  onChange={(e) => setStatusRisiko(e.target.value)}
                  className="w-full bg-[#EFECE4] border-none rounded-xl px-3.5 py-2.5 text-xs focus:outline-none text-gray-700 font-medium cursor-pointer"
                >
                  <option value="Semua Status">Semua Status</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                  <option value="PENDING">PENDING</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  RENTANG TANGGAL
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-gray-400">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </span>
                  <input
                    suppressHydrationWarning
                    type="text"
                    placeholder="01/07/2026 - 15/07/2026"
                    value={rentangTanggal}
                    onChange={(e) => setRentangTanggal(e.target.value)}
                    className="w-full bg-[#EFECE4] border-none rounded-xl pl-9 pr-3.5 py-2.5 text-xs focus:outline-none text-gray-700 font-medium placeholder-gray-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  CARI URL SITUS
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-gray-400">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    suppressHydrationWarning
                    type="text"
                    placeholder="http://contoh-domain.com"
                    value={cariUrl}
                    onChange={(e) => setCariUrl(e.target.value)}
                    className="w-full bg-[#EFECE4] border-none rounded-xl pl-9 pr-3.5 py-2.5 text-xs focus:outline-none text-gray-700 font-medium placeholder-gray-400"
                  />
                </div>
              </div>

              <div>
                <button
                  suppressHydrationWarning
                  onClick={handleApplyFilter}
                  className="w-full bg-[#4A2E18] hover:bg-[#382212] text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Terapkan
                </button>
              </div>
            </div>
          </div>

          {/* Tabel Utama */}
          <div className="bg-[#F5F2EA] rounded-2xl p-5 border border-[#EBE6DA]">
            {loading ? (
              <div className="text-center py-12 text-gray-500 text-xs font-medium">
                Mengambil data dari Supabase...
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-xs font-medium">
                Belum ada data klasifikasi yang sesuai.
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <div className="col-span-4">SITUS URL</div>
                  <div className="col-span-3">DILAPORKAN OLEH</div>
                  <div className="col-span-2 text-center">KLASIFIKASI</div>
                  <div className="col-span-2 text-center">TANGGAL DETEKSI</div>
                  <div className="col-span-1 text-right">AKSI</div>
                </div>

                {reports.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 items-center bg-white px-4 py-3 rounded-xl border border-[#EFECE6] shadow-2xs hover:border-gray-300 transition"
                  >
                    <div className="col-span-4 font-bold text-xs text-[#1A1A1A] flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#EFECE4] flex items-center justify-center text-[#A39B8B]">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m-9 9a9 9 0 019-9" />
                        </svg>
                      </span>
                      {item.situsUrl}
                    </div>

                    <div className="col-span-3 text-xs text-gray-500 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#EFECE4] flex items-center justify-center text-[#A39B8B]">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </span>
                      {item.dilaporkanOleh}
                    </div>

                    <div className="col-span-2 text-center">
                      <span className={`inline-block w-20 py-1 rounded-full text-[10px] font-bold tracking-wider ${getBadgeStyle(item.klasifikasi)}`}>
                        {item.klasifikasi}
                      </span>
                    </div>

                    <div className="col-span-2 text-center text-xs text-gray-500 font-medium">
                      {item.tanggalDeteksi}
                    </div>

                    <div className="col-span-1 text-right">
                      <Link
                        href={`/admin/verifikasi/${item.id}`}
                        className="inline-flex items-center gap-1 bg-white hover:bg-gray-50 border border-gray-300 text-[#4A2E18] font-semibold text-[11px] px-3.5 py-1.5 rounded-full transition whitespace-nowrap"
                      >
                        <span>Lihat Detail</span>
                        <span className="text-[10px]">&gt;</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Footer */}
            <div className="flex justify-between items-center mt-6 text-xs text-gray-500 font-medium">
              <div>
                Menampilkan {totalCount > 0 ? startIndex + 1 : 0} –{" "}
                {Math.min(startIndex + itemsPerPage, totalCount)} dari{" "}
                <span className="font-bold text-gray-800">{totalCount}</span> Laporan
              </div>

              <div className="flex gap-1.5 items-center">
                <button
                  suppressHydrationWarning
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-600 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    suppressHydrationWarning
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 font-bold rounded-full text-xs flex items-center justify-center transition cursor-pointer ${
                      currentPage === page
                        ? "bg-[#4A2E18] text-white"
                        : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  suppressHydrationWarning
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full text-xs disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
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
          <button
            suppressHydrationWarning
            className="border border-gray-300 px-4 py-1.5 rounded-full hover:bg-gray-50 font-medium text-gray-700 cursor-pointer"
          >
            Hubungi dukungan
          </button>
        </div>
      </footer>
    </div>
  );
}