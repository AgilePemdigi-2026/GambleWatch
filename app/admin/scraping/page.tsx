"use client";

// Web Scraping Monitor (Figma "Web Scraping Monitor - Hi-Fi", node 71:602).
// Data: tabel Supabase scrape_jobs + scrape_results (supabase/scraper_tables.sql), diisi oleh
// worker detection_engine/scraper/worker.py. Admin membaca lewat RLS dan hanya boleh menambah
// job baru berstatus PENDING; status dan hasil diubah oleh worker.

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { plusJakarta } from "@/components/site/fonts";
import AdminHeader from "@/components/AdminHeader";
import AdminFooter from "@/components/AdminFooter";
import { validateReportUrl } from "@/lib/detection/url";

const ICON = "/admin/scraping-monitor";
const PAGE_SIZE = 6;
const REFRESH_MS = 15_000; // label "Live": muat ulang otomatis
const MISSING_TABLE = new Set(["PGRST205", "42P01"]);

type JobStatus = "PENDING" | "IN_PROGRESS" | "SUCCESS" | "FAILED" | "BLOCKED";

interface ModuleSummary {
  score?: number;
  label?: string;
  findings?: string[];
}

interface ScrapeResult {
  final_url: string | null;
  http_status: number | null;
  title: string | null;
  indication: string | null;
  overall_score: number | null;
  modules: Record<string, ModuleSummary> | null;
  scraped_at: string;
}

interface ScrapeJob {
  id: number;
  url: string;
  source: string;
  status: JobStatus;
  failure_code: string | null;
  failure_message: string | null;
  attempts: number;
  created_at: string;
  finished_at: string | null;
  scrape_results: ScrapeResult[] | null;
}

interface Stats {
  running: number;
  queued: number;
  scannedToday: number;
  lastFinished: string | null;
  failedToday: number;
  topFailure: string | null;
}

const STATUS_STYLE: Record<JobStatus, { label: string; badge: string; dot: string }> = {
  SUCCESS: { label: "SUCCESS", badge: "bg-[#e9f5ea] border-[#cde5cf] text-[#1e7428]", dot: "bg-[#10b981]" },
  IN_PROGRESS: { label: "IN PROGRESS", badge: "bg-[#fef6e7] border-[#f8e3bf] text-[#9a6014]", dot: "bg-[#fbbf24]" },
  PENDING: { label: "PENDING", badge: "bg-[#f5efe6] border-[#e5dacd] text-[#70645c]", dot: "bg-[#c4b8ad]" },
  FAILED: { label: "FAILED", badge: "bg-[#fdf0ee] border-[#fad7d2] text-[#b83220]", dot: "bg-[#ef4444]" },
  BLOCKED: { label: "BLOCKED", badge: "bg-[#eef2fb] border-[#d6def3] text-[#33508f]", dot: "bg-[#6b7fd7]" },
};

const STATUS_FILTERS: { value: "" | JobStatus; label: string }[] = [
  { value: "", label: "Semua Status" },
  { value: "SUCCESS", label: "Success" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
  { value: "BLOCKED", label: "Blocked" },
];

// Kode kegagalan dari detection_engine/scraper/classify.py
const FAILURE_TEXT: Record<string, string> = {
  TIMEOUT: "Timeout saat memuat halaman",
  DNS: "Domain tidak ditemukan",
  CONNECTION: "Situs tidak dapat dihubungi",
  TLS: "Sertifikat situs bermasalah",
  HTTP_4XX: "Halaman tidak ditemukan / ditolak",
  HTTP_5XX: "Server situs error",
  BOT_PROTECTION: "Proteksi Cloudflare / anti-bot",
  UNSAFE_TARGET: "Alamat tidak diizinkan",
  DOWNLOAD: "Link berupa unduhan",
  STALE: "Macet, dihentikan otomatis",
  ERROR: "Galat tak dikenal",
  BLOCKED: "Diblokir Internet Positif",
};

function Icon({ name, w, h, alt = "" }: { name: string; w: number; h: number; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- ikon SVG statis dari Figma
  return <img src={`${ICON}/${name}.svg`} width={w} height={h} alt={alt} className="block shrink-0" />;
}

const pad = (n: number) => String(n).padStart(2, "0");

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function relativeTime(iso: string | null, now: number): string {
  if (!iso) return "Belum ada scraping";
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} menit yang lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam yang lalu`;
  return `${Math.round(hours / 24)} hari yang lalu`;
}

const hostOf = (url: string) => {
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
};

const latestResult = (job: ScrapeJob) =>
  [...(job.scrape_results ?? [])].sort((a, b) => b.scraped_at.localeCompare(a.scraped_at))[0] ?? null;

// "Data ditemukan": jumlah temuan semua modul deteksi pada hasil terakhir
function evidenceCount(result: ScrapeResult | null): number {
  if (!result?.modules) return 0;
  return Object.values(result.modules).reduce((sum, m) => sum + (m?.findings?.length ?? 0), 0);
}

function pageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [...new Set([1, 2, 3, current, total].filter((p) => p >= 1 && p <= total))].sort((a, b) => a - b);
  const out: (number | "...")[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push("...");
    out.push(p);
  });
  return out;
}

export default function WebScrapingMonitorPage() {
  const supabase = useMemo(() => createClient(), []);

  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadedAt, setLoadedAt] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | JobStatus>("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [showNewScan, setShowNewScan] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState<ScrapeJob | null>(null);

  // Pencarian dijalankan setelah pengguna berhenti mengetik
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // "Live": muat ulang berkala selama halaman terbuka
  useEffect(() => {
    const timer = setInterval(() => setReloadKey((k) => k + 1), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();

      let query = supabase
        .from("scrape_jobs")
        .select(
          "id,url,source,status,failure_code,failure_message,attempts,created_at,finished_at," +
            "scrape_results(final_url,http_status,title,indication,overall_score,modules,scraped_at)",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (statusFilter) query = query.eq("status", statusFilter);
      if (search) query = query.ilike("url", `%${search.replace(/[%_]/g, "")}%`);

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const [list, running, queued, today, last] = await Promise.all([
        query,
        supabase.from("scrape_jobs").select("id", { count: "exact", head: true }).eq("status", "IN_PROGRESS"),
        supabase.from("scrape_jobs").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
        supabase.from("scrape_jobs").select("url,status,failure_code")
          .gte("finished_at", startOfDay.toISOString()).limit(5000),
        supabase.from("scrape_jobs").select("finished_at").not("finished_at", "is", null)
          .order("finished_at", { ascending: false }).limit(1),
      ]);
      if (!active) return;

      setIsAdmin(auth.user?.app_metadata?.role === "admin");
      setLoadedAt(Date.now());
      setLoading(false);
      if (list.error) {
        if (MISSING_TABLE.has(list.error.code)) setSetupNeeded(true);
        else toast.error(`Gagal memuat data scraping: ${list.error.message}`, { id: "scraping-load" });
        setJobs([]);
        setTotal(0);
        return;
      }
      setSetupNeeded(false);
      setJobs((list.data ?? []) as unknown as ScrapeJob[]);
      setTotal(list.count ?? 0);

      const finished = (today.data ?? []) as { url: string; status: JobStatus; failure_code: string | null }[];
      const failed = finished.filter((j) => j.status === "FAILED");
      const reasons = new Map<string, number>();
      failed.forEach((j) => reasons.set(j.failure_code ?? "ERROR", (reasons.get(j.failure_code ?? "ERROR") ?? 0) + 1));
      const topCode = [...reasons.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      setStats({
        running: running.count ?? 0,
        queued: queued.count ?? 0,
        scannedToday: new Set(finished.map((j) => hostOf(j.url))).size,
        lastFinished: (last.data?.[0] as { finished_at: string } | undefined)?.finished_at ?? null,
        failedToday: failed.length,
        topFailure: topCode ? FAILURE_TEXT[topCode] ?? topCode : null,
      });
    })();
    return () => {
      active = false;
    };
  }, [supabase, page, statusFilter, search, reloadKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const firstShown = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const lastShown = Math.min(page * PAGE_SIZE, total);

  const openNewScan = () => {
    if (!isAdmin) {
      toast.error("Hanya admin yang dapat menjalankan scan. Silakan masuk sebagai admin.");
      return;
    }
    setNewUrl("");
    setShowNewScan(true);
  };

  const submitNewScan = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = newUrl.trim();
    if (!url) {
      toast.error("Masukkan link situs yang akan dipindai.");
      return;
    }
    const urlError = validateReportUrl(url);
    if (urlError) {
      toast.error(urlError);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("scrape_jobs").insert({ url, source: "manual", priority: 5 });
    setSaving(false);
    if (error) {
      toast.error(MISSING_TABLE.has(error.code)
        ? "Tabel scraping belum dibuat. Jalankan supabase/scraper_tables.sql."
        : `Gagal menambah scan: ${error.message}`);
      return;
    }
    toast.success("Scan ditambahkan ke antrean. Worker akan memprosesnya.");
    setShowNewScan(false);
    setPage(1);
    setReloadKey((k) => k + 1);
  };

  const statCards = [
    {
      title: "Pekerjaan Aktif", icon: "ikon-aktif", iconBox: "bg-[#f4f8f4] border-[#dcecdc]",
      value: stats ? String(stats.running) : "–",
      note: stats ? `Sedang berjalan · ${stats.queued} dalam antrean` : "Memuat...", dot: true, danger: false,
    },
    {
      title: "Situs Dipindai Hari Ini", icon: "ikon-globe", iconBox: "bg-[#fbf5ec] border-[#f0e2ce]",
      value: stats ? String(stats.scannedToday) : "–", note: "Total domain unik diproses", dot: false, danger: false,
    },
    {
      title: "Waktu Scraping Terakhir", icon: "ikon-jam", iconBox: "bg-[#f5efe6] border-[#e5dacd]",
      value: stats?.lastFinished ? formatTimestamp(stats.lastFinished).slice(11) : "–",
      suffix: stats?.lastFinished ? "WIB" : undefined,
      note: stats ? relativeTime(stats.lastFinished, loadedAt) : "Memuat...", dot: false, danger: false,
    },
    {
      title: "Error / Gagal", icon: "ikon-peringatan", iconBox: "bg-[#fdf2f2] border-[#f8d4d4]",
      value: stats ? String(stats.failedToday) : "–",
      note: stats ? (stats.topFailure ? `Terbanyak: ${stats.topFailure}` : "Tidak ada kegagalan hari ini") : "Memuat...",
      dot: false, danger: true,
    },
  ];

  return (
    <div className={`${plusJakarta.className} min-h-screen bg-[#faf7f2] text-[#38220f] flex flex-col`}>
      <AdminHeader activeTab="analisis" />

      <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-8 px-4 py-10 md:px-8">
        {/* Judul dan aksi utama */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[30px] font-extrabold leading-9 tracking-[-0.75px]">Web Scraping Monitor</h1>
            <p className="text-sm font-medium leading-5 text-[#70645c]">
              Pantau proses scraping situs secara real-time dan kelola penjadwalan scan.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled
              title="Pengaturan bot belum tersedia"
              className="flex items-center gap-2 rounded-full border border-[#d5cbc0] bg-white px-[17px] py-[11px] text-xs font-semibold leading-4 text-[#70645c] opacity-60 cursor-not-allowed"
            >
              <Icon name="ikon-pengaturan" w={16} h={16} />
              Pengaturan Bot
            </button>
            <button
              type="button"
              onClick={openNewScan}
              className="flex items-center gap-2 rounded-full bg-[#452a18] px-5 py-2.5 text-xs font-bold leading-4 text-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#38220f]"
            >
              <Icon name="ikon-jalankan" w={16} h={16} />
              Jalankan Scan Baru
            </button>
          </div>
        </div>

        {setupNeeded && (
          <div role="alert" className="rounded-2xl border border-[#f8e3bf] bg-[#fef6e7] px-5 py-4 text-sm text-[#9a6014]">
            Tabel scraping belum dibuat di Supabase. Jalankan <code className="font-mono">supabase/scraper_tables.sql</code> di
            SQL Editor, lalu nyalakan worker <code className="font-mono">python -m detection_engine.scraper.worker</code>.
          </div>
        )}

        {/* Empat kartu statistik */}
        <section aria-label="Ringkasan scraping" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div key={card.title} className="flex flex-col justify-between rounded-2xl border border-[#e8e1d8] bg-white p-[21px]">
              <div className="flex items-start justify-between">
                <p className="text-xs font-semibold leading-4 text-[#70645c]">{card.title}</p>
                <span className={`flex size-9 items-center justify-center rounded-xl border ${card.iconBox}`}>
                  <Icon name={card.icon} w={16} h={16} />
                </span>
              </div>
              <div className="flex flex-col gap-1 pt-4">
                <p className={`text-[30px] font-extrabold leading-9 tracking-[-0.75px] ${card.danger ? "text-[#c53030]" : "text-[#38220f]"}`}>
                  {card.value}
                  {card.suffix && <span className="ml-1.5 text-sm font-bold tracking-normal text-[#70645c]">{card.suffix}</span>}
                </p>
                <p className="flex items-center gap-1.5 text-xs font-medium leading-4 text-[#70645c]">
                  {card.dot && <span className="size-2 rounded-full bg-[#10b981]" aria-hidden />}
                  {card.note}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* Tabel pemantauan */}
        <section aria-label="Daftar pemantauan scraping" className="overflow-hidden rounded-2xl border border-[#e8e1d8] bg-white">
          <div className="flex flex-col gap-3 border-b border-[#e8e1d8] bg-[rgba(252,250,247,0.5)] px-5 pb-[21px] pt-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold leading-6">Daftar Pemantauan Scraping</h2>
              <span className="rounded-full border border-[#e5dacd] bg-[#f5efe6] px-[11px] py-[3px] text-[11px] font-bold leading-[16.5px] text-[#70645c]">
                Live
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="relative w-full sm:w-64">
                <span className="sr-only">Cari domain atau URL</span>
                <span className="pointer-events-none absolute left-3 top-[10px]"><Icon name="ikon-cari" w={16} h={16} /></span>
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Cari domain / URL..."
                  className="w-full rounded-xl border border-[#e8e1d8] bg-white py-[9px] pl-[37px] pr-[15px] text-xs font-medium text-[#38220f] placeholder:text-[#9c8f85] focus:border-[#c4b8ad] focus:outline-none"
                />
              </label>
              <label className="relative">
                <span className="sr-only">Filter status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value as "" | JobStatus); setPage(1); }}
                  className="appearance-none rounded-xl border border-[#e8e1d8] bg-white py-[9px] pl-[15px] pr-[33px] text-xs font-semibold text-[#70645c] focus:border-[#c4b8ad] focus:outline-none"
                >
                  {STATUS_FILTERS.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
                </select>
                <span className="pointer-events-none absolute right-[9px] top-[8px]"><Icon name="ikon-dropdown" w={18} h={18} /></span>
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead className="border-b border-[#e8e1d8] bg-[#faf7f2]">
                <tr className="text-[11px] font-semibold uppercase leading-[16.5px] tracking-[0.55px] text-[#6e6158]">
                  <th className="px-6 py-3.5">Situs URL</th>
                  <th className="px-6 py-3.5">Waktu Scrape (Timestamp)</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Data Ditemukan</th>
                  <th className="px-6 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-xs text-[#70645c]">Memuat data scraping...</td></tr>
                )}
                {!loading && jobs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-xs text-[#70645c]">
                      {search || statusFilter ? "Tidak ada pekerjaan yang cocok dengan filter." : "Belum ada pekerjaan scraping."}
                    </td>
                  </tr>
                )}
                {jobs.map((job) => {
                  const style = STATUS_STYLE[job.status] ?? STATUS_STYLE.PENDING;
                  const result = latestResult(job);
                  const bukti = evidenceCount(result);
                  const running = job.status === "PENDING" || job.status === "IN_PROGRESS";
                  return (
                    <tr key={job.id} className="border-t border-[#f0ebe3] first:border-t-0">
                      <td className="px-6 py-[23px]">
                        <span className="flex items-center gap-2">
                          <span className={`size-2 shrink-0 rounded-full ${style.dot}`} aria-hidden />
                          <span className="max-w-[260px] truncate font-mono text-xs text-[#452a18]" title={job.url}>{job.url}</span>
                        </span>
                      </td>
                      <td className="px-6 py-[23px] text-xs font-medium text-[#70645c]">
                        {formatTimestamp(job.finished_at ?? job.created_at)}
                      </td>
                      <td className="px-6 py-[18.5px]">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-[11px] py-[5px] text-[11px] font-bold leading-4 ${style.badge}`}>
                          {job.status === "IN_PROGRESS" && <span className="size-1.5 rounded-full bg-[#9a6014]" aria-hidden />}
                          {style.label}
                        </span>
                      </td>
                      <td className="px-6 py-[23px] text-xs">
                        {running ? (
                          <span className="font-semibold text-[#8c7e75]">—</span>
                        ) : bukti > 0 ? (
                          <span className="flex items-center gap-1 font-semibold text-[#2e7d32]">
                            <Icon name="ikon-centang" w={14} h={14} />
                            Ya ({bukti} Bukti)
                          </span>
                        ) : (
                          <span className="font-medium text-[#8c7e75]">Tidak</span>
                        )}
                      </td>
                      <td className="px-6 py-[16.5px] text-right">
                        <button
                          type="button"
                          onClick={() => setDetail(job)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#d5cbc0] px-[13px] py-[7px] text-xs font-semibold leading-4 text-[#452a18] hover:bg-[#faf7f2]"
                          aria-label={`Lihat detail ${job.url}`}
                        >
                          Lihat Detail
                          <Icon name="ikon-panah" w={4.75} h={8.25} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#e8e1d8] bg-[rgba(250,247,242,0.4)] px-5 pb-5 pt-[21px] sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-[#70645c]">
              Menampilkan <b className="text-[#38220f]">{firstShown} - {lastShown}</b> dari{" "}
              <b className="text-[#38220f]">{total}</b> Pekerjaan
            </p>
            <nav aria-label="Halaman tabel" className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-full border border-[#d5cbc0] px-[15px] py-[7px] text-xs font-semibold text-[#70645c] disabled:opacity-40"
              >
                Sebelumnya
              </button>
              {pageNumbers(page, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`gap-${i}`} className="px-1 text-xs font-bold text-[#9c8f85]">...</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    aria-current={p === page ? "page" : undefined}
                    className={`size-8 rounded-full text-xs ${p === page ? "bg-[#452a18] font-bold text-white" : "border border-[#d5cbc0] font-semibold text-[#70645c]"}`}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-full border border-[#d5cbc0] px-[15px] py-[7px] text-xs font-semibold text-[#70645c] disabled:opacity-40"
              >
                Selanjutnya
              </button>
            </nav>
          </div>
        </section>
      </main>

      <AdminFooter />

      {/* Modal: scan baru */}
      {showNewScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="scan-baru-judul">
          <form onSubmit={submitNewScan} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 id="scan-baru-judul" className="text-lg font-bold">Jalankan Scan Baru</h3>
            <p className="mt-1 text-xs text-[#70645c]">
              Link dimasukkan ke antrean. Worker scraping akan membuka situs dan menilainya dengan DET-01 sampai DET-04.
            </p>
            <label className="mt-4 block text-xs font-semibold text-[#38220f]" htmlFor="scan-baru-url">Link situs</label>
            <input
              id="scan-baru-url"
              type="text"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://contoh-situs.com"
              className="mt-1.5 w-full rounded-xl border border-[#e8e1d8] px-4 py-2.5 text-sm focus:border-[#c4b8ad] focus:outline-none"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowNewScan(false)} className="rounded-full border border-[#d5cbc0] px-4 py-2 text-xs font-semibold text-[#70645c]">
                Batal
              </button>
              <button type="submit" disabled={saving} className="rounded-full bg-[#452a18] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                {saving ? "Menambahkan..." : "Tambahkan ke Antrean"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: detail pekerjaan */}
      {detail && (() => {
        const result = latestResult(detail);
        const style = STATUS_STYLE[detail.status] ?? STATUS_STYLE.PENDING;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="detail-judul">
            <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex items-start justify-between gap-3">
                <h3 id="detail-judul" className="break-all font-mono text-sm font-bold">{detail.url}</h3>
                <span className={`shrink-0 rounded-full border px-[11px] py-[5px] text-[11px] font-bold ${style.badge}`}>{style.label}</span>
              </div>
              <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
                <dt className="text-[#70645c]">Ditambahkan</dt><dd>{formatTimestamp(detail.created_at)} WIB ({detail.source})</dd>
                <dt className="text-[#70645c]">Selesai</dt><dd>{detail.finished_at ? `${formatTimestamp(detail.finished_at)} WIB` : "Belum selesai"}</dd>
                <dt className="text-[#70645c]">Percobaan</dt><dd>{detail.attempts}</dd>
                {detail.failure_code && (
                  <>
                    <dt className="text-[#70645c]">Alasan</dt>
                    <dd>{FAILURE_TEXT[detail.failure_code] ?? detail.failure_code}</dd>
                  </>
                )}
                {result && (
                  <>
                    <dt className="text-[#70645c]">Judul halaman</dt><dd>{result.title || "—"}</dd>
                    <dt className="text-[#70645c]">URL akhir</dt><dd className="break-all">{result.final_url || "—"}</dd>
                    <dt className="text-[#70645c]">Indikasi</dt>
                    <dd className="font-bold">
                      {result.indication ?? "—"}
                      {typeof result.overall_score === "number" && ` (${Math.round(result.overall_score * 100)}%)`}
                    </dd>
                  </>
                )}
              </dl>
              {result?.modules && (
                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#6e6158]">Temuan per modul</p>
                  {Object.entries(result.modules).map(([key, m]) => (
                    <div key={key} className="rounded-xl border border-[#f0ebe3] px-3 py-2 text-xs">
                      <p className="font-semibold">{key} · {m.label ?? "—"} ({Math.round((m.score ?? 0) * 100)}%)</p>
                      {(m.findings?.length ?? 0) > 0 && <p className="mt-0.5 text-[#70645c]">{m.findings!.slice(0, 8).join(", ")}</p>}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-5 flex justify-end">
                <button type="button" onClick={() => setDetail(null)} className="rounded-full bg-[#452a18] px-4 py-2 text-xs font-bold text-white">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
