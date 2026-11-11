"use client";

// Keyword Database (Figma "Keyword Database - Hi-Fi", node 71:1562).
// Data: tabel Supabase `keywords`, yang juga dibaca mesin deteksi DET-04 (sinkron tiap 15 menit).
// Tulis (tambah/edit/hapus/import) hanya untuk akun admin; dibatasi oleh RLS di
// supabase/keywords_admin.sql, bukan hanya oleh tampilan ini.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { plusJakarta } from "@/components/site/fonts";

interface KeywordRow {
  id: number;
  term: string;
  category: string;
  weight: number;
  active: boolean;
  language: string;
  created_at?: string | null; // ada setelah supabase/keywords_admin.sql dijalankan
  updated_at?: string | null;
}

// Kategori di database -> label tampilan. Lima pertama = "Kategori populer" di Figma.
const CATEGORIES: { value: string; label: string }[] = [
  { value: "slot", label: "Slot" },
  { value: "card_game", label: "Poker" },
  { value: "lottery", label: "Togel" },
  { value: "casino", label: "Casino" },
  { value: "sports", label: "Sports Betting" },
  { value: "betting", label: "Taruhan" },
  { value: "promotion", label: "Promosi" },
  { value: "payment", label: "Pembayaran" },
  { value: "brand", label: "Merek situs" },
  { value: "provider", label: "Provider game" },
  { value: "agent", label: "Agen/Bandar" },
  { value: "game_info", label: "Info game (RTP)" },
  { value: "gambling", label: "Judi umum" },
];
const POPULAR = CATEGORIES.slice(0, 5);
const PAGE_SIZE = 8;
const ICON = "/admin/keyword-database";

const categoryLabel = (value: string) =>
  CATEGORIES.find((c) => c.value === value)?.label ?? value;

const formatDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
    : "-";

const formatTime = (iso?: string | null) =>
  iso
    ? `Pukul ${new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":")} WIB`
    : "Jalankan supabase/keywords_admin.sql";

// Ikon statis dari Figma; ukuran mengikuti desain
function Icon({ name, w, h, alt = "" }: { name: string; w: number; h: number; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`${ICON}/${name}.svg`} width={w} height={h} alt={alt} className="block shrink-0" />;
}

// CSV sederhana: kolom term,category[,weight,active]; tanda kutip ganda didukung
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells: string[] = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') { cell += '"'; i++; }
        else if (ch === '"') quoted = false;
        else cell += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === ",") { cells.push(cell); cell = ""; }
      else cell += ch;
    }
    cells.push(cell);
    rows.push(cells.map((c) => c.trim()));
  }
  return rows;
}

const csvCell = (value: string | number | boolean) => {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function pageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, 2, 3, current, total].filter((p) => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "...")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("...");
    out.push(p);
  });
  return out;
}

export default function KeywordDatabasePage() {
  const supabase = useMemo(() => createClient(), []);
  const fileInput = useRef<HTMLInputElement>(null);

  const [rows, setRows] = useState<KeywordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<KeywordRow | null>(null);

  // Naikkan untuk memuat ulang setelah tambah/edit/hapus/import
  const [reloadKey, setReloadKey] = useState(0);
  const load = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      // Tanpa login admin, RLS hanya mengembalikan kata yang aktif
      const { data, error } = await supabase.from("keywords").select("*").order("id", { ascending: false });
      if (!active) return;
      setIsAdmin(auth.user?.app_metadata?.role === "admin");
      if (error) toast.error(`Gagal memuat kata kunci: ${error.message}`);
      setRows((data as KeywordRow[]) ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [supabase, reloadKey]);

  const stats = useMemo(() => {
    const updated = rows.map((r) => r.updated_at).filter(Boolean).sort().at(-1) ?? null;
    return {
      total: rows.length,
      active: rows.filter((r) => r.active).length,
      updated,
      categories: new Set(rows.map((r) => r.category)).size,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.term.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)
      || categoryLabel(r.category).toLowerCase().includes(q));
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const requireAdmin = () => {
    if (isAdmin) return true;
    toast.error("Hanya admin yang dapat mengubah kata kunci. Silakan masuk sebagai admin.");
    return false;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requireAdmin()) return;
    const clean = term.trim().toLowerCase().replace(/\s+/g, " ");
    if (!clean || !category) { toast.error("Isi keyword dan pilih kategori."); return; }
    if (clean.length > 100) { toast.error("Keyword maksimal 100 karakter."); return; }
    setSaving(true);
    const { error } = await supabase.from("keywords").insert({ term: clean, category, language: "id", active: true });
    setSaving(false);
    if (error) {
      toast.error(error.code === "23505" ? `"${clean}" sudah ada di database.` : `Gagal menambah: ${error.message}`);
      return;
    }
    toast.success(`"${clean}" ditambahkan. Dipakai mesin deteksi paling lambat 15 menit lagi.`);
    setTerm("");
    load();
  };

  const handleSaveEdit = async () => {
    if (!editing || !requireAdmin()) return;
    const clean = editing.term.trim().toLowerCase().replace(/\s+/g, " ");
    if (!clean) { toast.error("Keyword tidak boleh kosong."); return; }
    const { error } = await supabase.from("keywords")
      .update({ term: clean, category: editing.category, active: editing.active })
      .eq("id", editing.id);
    if (error) { toast.error(`Gagal menyimpan: ${error.message}`); return; }
    toast.success("Kata kunci diperbarui.");
    setEditing(null);
    load();
  };

  const handleDelete = async (row: KeywordRow) => {
    if (!requireAdmin()) return;
    if (!window.confirm(`Hapus kata kunci "${row.term}"? Mesin deteksi tidak akan memakainya lagi.`)) return;
    const { error, count } = await supabase.from("keywords").delete({ count: "exact" }).eq("id", row.id);
    if (error || !count) { toast.error(`Gagal menghapus${error ? `: ${error.message}` : " (tidak ada izin)"}`); return; }
    toast.success(`"${row.term}" dihapus.`);
    load();
  };

  const handleExport = () => {
    const header = "term,category,weight,active,language,created_at";
    const lines = rows.map((r) => [r.term, r.category, r.weight, r.active, r.language, r.created_at ?? ""].map(csvCell).join(","));
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keywords-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !requireAdmin()) return;
    if (file.size > 1024 * 1024) { toast.error("Berkas CSV maksimal 1 MB."); return; }
    const table = parseCsv(await file.text());
    const [head, ...body] = table;
    const col = (name: string) => head?.findIndex((h) => h.toLowerCase() === name) ?? -1;
    const iTerm = col("term");
    const iCat = col("category");
    if (iTerm < 0 || iCat < 0) { toast.error("CSV harus punya kolom term dan category."); return; }
    const iWeight = col("weight");
    const iActive = col("active");
    const valid = new Set(CATEGORIES.map((c) => c.value));
    const items = body
      .map((r) => ({
        term: (r[iTerm] ?? "").toLowerCase().replace(/\s+/g, " ").trim(),
        category: valid.has(r[iCat]) ? r[iCat] : "gambling",
        weight: iWeight >= 0 && r[iWeight] !== "" ? Math.min(1, Math.max(0, Number(r[iWeight]) || 0.5)) : 0.5,
        active: iActive >= 0 ? !/^(false|0|tidak|no)$/i.test(r[iActive] ?? "") : true,
        language: "id",
      }))
      .filter((r) => r.term && r.term.length <= 100);
    if (!items.length) { toast.error("Tidak ada baris yang valid di CSV."); return; }
    const { error } = await supabase.from("keywords").upsert(items, { onConflict: "term,language" });
    if (error) { toast.error(`Import gagal: ${error.message}`); return; }
    toast.success(`${items.length} kata kunci diimpor (yang sudah ada diperbarui).`);
    load();
  };

  return (
    <div className={`${plusJakarta.className} min-h-screen bg-[#fbf9f5] text-[#1b1c1a] flex flex-col`}>
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-[12px] bg-[rgba(251,249,245,0.9)] shadow-[0px_1px_8px_0px_rgba(120,82,51,0.04)]">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between gap-4 px-4 md:px-12">
          <Link href="/admin" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Logo GambleWatch" width={44} height={44} priority />
            <div>
              <p className="text-base font-semibold uppercase leading-6 tracking-[-0.4px]">GAMBLEWATCH</p>
              <p className="text-[11px] font-medium leading-[14px] text-[#50453c]">Deteksi perjudian online ilegal</p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center rounded-full bg-[#f5f3ef] p-1">
            <Link href="/admin" className="rounded-full px-4 py-1 text-sm font-semibold leading-5 text-[#50453c]">Beranda</Link>
            <span className="rounded-full bg-[#785233] px-4 py-1 text-base font-semibold leading-6 text-white drop-shadow-[0px_1px_1.5px_rgba(120,82,51,0.08)]">Analisis perjudian</span>
            <Link href="#" className="rounded-full px-4 py-1 text-sm font-semibold leading-5 text-[#50453c]">Umpan balik</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/my-analyses" className="flex items-center gap-1 rounded-full bg-[#5d3b1e] px-4 py-2 text-sm font-semibold leading-5 text-white drop-shadow-[0px_1px_1.5px_rgba(120,82,51,0.12)]">
              <Icon name="ikon-analisis-saya" w={13.5} h={13.5} />
              Analisis saya
            </Link>
            <span className="flex size-8 items-center justify-center rounded-full bg-[#5d3b1e]" title={isAdmin ? "Masuk sebagai admin" : "Belum masuk sebagai admin"}>
              <Icon name="ikon-profil" w={12} h={12} />
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-8 px-4 py-8 md:px-12">
        {/* Judul */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <span className="flex items-center gap-1.5 rounded-full bg-[#efeeea] px-2.5 py-0.5 text-[11px] font-medium leading-[14px] text-[#50453c]">
                <span className="size-1.5 rounded-full bg-[#5d3b1e]" />
                Manajemen Data &amp; Deteksi
              </span>
              <span className="text-[11px] font-medium leading-[14px] text-[#50453c]">/</span>
              <span className="text-[11px] font-semibold leading-[14px] text-[#5d3b1e]">Pangkalan Data Kata Kunci</span>
            </div>
            <h1 className="text-[32px] font-bold leading-10 tracking-[-0.8px]">Keyword Database</h1>
            <p className="max-w-[672px] text-sm leading-[22px] text-[#50453c]">
              Kelola kata kunci untuk scraping dan deteksi cerdas situs perjudian online ilegal secara terpusat dan berdaya analitik tinggi.
            </p>
          </div>
          <span className="flex w-fit items-center gap-2 rounded-full bg-[#f5f3ef] px-4 py-1 text-[11px] font-medium leading-[14px] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
            <span className="size-2.5 rounded-full bg-[#2b4933]" />
            Mesin Deteksi: Sinkron tiap 15 menit
          </span>
        </div>

        {!loading && !isAdmin && (
          <div className="rounded-xl border border-[#ffdcc3] bg-[#fff6ef] px-4 py-3 text-xs leading-[18px] text-[#50453c]">
            Mode baca saja: hanya kata kunci aktif yang terlihat. <Link href="/sign-in/sign-in-admin" className="font-semibold text-[#5d3b1e] underline">Masuk sebagai admin</Link> untuk menambah, mengubah, atau menghapus kata kunci.
          </div>
        )}

        {/* KPI */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Kata Kunci", value: stats.total.toLocaleString("id-ID"), note: "Terdaftar di sistem", icon: "ikon-total", w: 15, h: 15, bg: "bg-[#f5f3ef]", color: "" },
            { label: "Kata Kunci Aktif", value: stats.active.toLocaleString("id-ID"), note: "Aktif digunakan mesin deteksi", icon: "ikon-aktif", w: 18.333, h: 17.5, bg: "bg-[rgba(200,235,204,0.3)]", color: "text-[#2b4933]" },
            { label: "Terakhir Diperbarui", value: formatDate(stats.updated), note: formatTime(stats.updated), icon: "ikon-diperbarui", w: 16.667, h: 16.667, bg: "bg-[rgba(255,220,189,0.4)]", color: "", small: true },
            { label: "Kategori", value: `${stats.categories} Kategori`, note: "Jenis kata kunci terdaftar", icon: "ikon-sumber", w: 20, h: 19.167, bg: "bg-[#efeeea]", color: "" },
          ].map((card) => (
            <div key={card.label} className="flex flex-col gap-4 rounded-xl bg-white p-6 drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium leading-4 text-[#50453c]">{card.label}</p>
                <span className={`flex size-10 items-center justify-center rounded-xl shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] ${card.bg}`}>
                  <Icon name={card.icon} w={card.w} h={card.h} />
                </span>
              </div>
              <div>
                <p className={`font-bold ${card.small ? "pt-1 text-2xl leading-8 tracking-[-0.6px]" : "text-4xl leading-[44px] tracking-[-0.9px]"} ${card.color}`}>
                  {loading ? "…" : card.value}
                </p>
                <p className="pt-1 text-xs leading-[18px] text-[#50453c]">{card.note}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Tambah keyword */}
        <section className="flex flex-col gap-4 rounded-xl bg-white p-6 md:p-8 drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-1 pb-1">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#ffdcc3]">
              <Icon name="ikon-tambah-judul" w={15} h={15} />
            </span>
            <div>
              <h2 className="text-base font-bold leading-6 tracking-[-0.4px]">Tambah Keyword Baru</h2>
              <p className="text-xs leading-[18px] text-[#50453c]">Tambahkan kata kunci untuk meningkatkan jangkauan pemantauan crawler web otomatis.</p>
            </div>
          </div>
          <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-end">
            <label className="flex flex-col gap-1.5 md:col-span-6">
              <span className="text-xs font-semibold leading-4">Keyword <span className="text-[#ba1a1a]">*</span></span>
              <span className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5"><Icon name="ikon-hash" w={13.5} h={12} /></span>
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  maxLength={100}
                  placeholder="Masukkan kata kunci baru..."
                  className="w-full rounded-lg bg-[#f5f3ef] py-3 pl-10 pr-4 text-sm shadow-[inset_0px_2px_4px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-[rgba(80,69,60,0.7)] focus:ring-2 focus:ring-[#5d3b1e]/30"
                />
              </span>
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-4">
              <span className="text-xs font-semibold leading-4">Kategori <span className="text-[#ba1a1a]">*</span></span>
              <span className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5"><Icon name="ikon-kategori" w={14.25} h={15} /></span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full appearance-none rounded-lg bg-[#f5f3ef] px-10 py-2.5 text-sm leading-[22px] shadow-[inset_0px_2px_4px_0px_rgba(0,0,0,0.05)] outline-none focus:ring-2 focus:ring-[#5d3b1e]/30"
                >
                  <option value="">Pilih kategori...</option>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5"><Icon name="ikon-panah-bawah" w={9} h={5.55} /></span>
              </span>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="flex h-11 items-center justify-center gap-1 rounded-lg bg-[#5d3b1e] px-4 text-sm font-semibold leading-5 text-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] disabled:opacity-60 md:col-span-2"
            >
              <Icon name="ikon-plus" w={10.5} h={10.5} />
              {saving ? "Menyimpan..." : "Tambah"}
            </button>
          </form>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-[11px] font-medium leading-[14px] text-[#50453c]">Kategori populer:</span>
            {POPULAR.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCategory(c.value)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-[14px] ${category === c.value ? "bg-[#5d3b1e] text-white" : "bg-[#efeeea] text-[#50453c]"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </section>

        {/* Pencarian & CSV */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="relative w-full md:max-w-[512px]">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5"><Icon name="ikon-cari" w={15} h={15} /></span>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari keyword atau kategori..."
              className="w-full rounded-full bg-white py-3 pl-10 pr-4 text-sm shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline-none placeholder:text-[rgba(80,69,60,0.7)] focus:ring-2 focus:ring-[#5d3b1e]/30"
            />
          </label>
          <div className="flex items-center gap-2">
            <input ref={fileInput} type="file" accept=".csv,text/csv" onChange={handleImport} className="hidden" />
            <button type="button" onClick={() => requireAdmin() && fileInput.current?.click()} className="flex items-center gap-1 rounded-full bg-white px-4 py-2.5 text-xs font-semibold leading-4 drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
              <Icon name="ikon-import" w={12} h={15} />
              Import CSV
            </button>
            <button type="button" onClick={handleExport} disabled={!rows.length} className="flex items-center gap-1 rounded-full bg-[#5d3b1e] px-4 py-2.5 text-xs font-semibold leading-4 text-white drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] disabled:opacity-60">
              <Icon name="ikon-export" w={12} h={12} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Tabel */}
        <section className="overflow-hidden rounded-xl bg-white shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="bg-[#f5f3ef]">
                <tr className="text-xs font-semibold uppercase leading-4 tracking-[0.6px] text-[#50453c]">
                  <th className="px-6 py-3.5">No</th>
                  <th className="px-6 py-3.5">Keyword</th>
                  <th className="px-6 py-3.5">Kategori</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Tanggal Ditambahkan</th>
                  <th className="px-6 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-[#50453c]">Memuat kata kunci dari Supabase...</td></tr>
                )}
                {!loading && visible.length === 0 && (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-[#50453c]">{search ? "Tidak ada kata kunci yang cocok." : "Belum ada kata kunci."}</td></tr>
                )}
                {!loading && visible.map((row, i) => (
                  <tr key={row.id} className="border-t border-[#f5f3ef] first:border-t-0">
                    <td className="px-6 py-4 text-sm font-medium leading-[22px] text-[#50453c]">
                      {String((current - 1) * PAGE_SIZE + i + 1).padStart(2, "0")}
                    </td>
                    <td className="px-6 py-4 text-base font-bold leading-6">{row.term}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-[#efeeea] px-2.5 py-0.5 text-[11px] font-semibold leading-[14px] text-[#50453c]">{categoryLabel(row.category)}</span>
                    </td>
                    <td className="px-6 py-4">
                      {row.active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#c8ebcc] px-2.5 py-0.5 text-[11px] font-bold uppercase leading-[14px] tracking-[0.275px] text-[#03210e]">
                          <span className="size-1.5 rounded-full bg-[#2b4933]" />Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e4e2de] px-2.5 py-0.5 text-[11px] font-semibold uppercase leading-[14px] tracking-[0.275px] text-[#50453c]">
                          <span className="size-1.5 rounded-full bg-[#82746b]" />Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium leading-[22px] text-[#50453c]">{formatDate(row.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => requireAdmin() && setEditing({ ...row })} className="rounded-full bg-[#efeeea] px-3 py-1 text-[11px] font-medium leading-[14px]">Edit</button>
                        <button type="button" onClick={() => handleDelete(row)} className="rounded-full bg-[rgba(255,218,214,0.6)] px-3 py-1 text-[11px] font-medium leading-[14px] text-[#ba1a1a]">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 bg-[rgba(245,243,239,0.4)] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-[18px] text-[#50453c]">
              Menampilkan <span className="font-semibold text-[#1b1c1a]">{filtered.length ? `${(current - 1) * PAGE_SIZE + 1} - ${Math.min(current * PAGE_SIZE, filtered.length)}` : "0"}</span>{" "}
              dari <span className="font-semibold text-[#1b1c1a]">{filtered.length.toLocaleString("id-ID")}</span> Kata Kunci
            </p>
            <div className="flex flex-wrap items-center gap-1">
              <button type="button" disabled={current === 1} onClick={() => setPage(current - 1)} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-medium leading-[14px] text-[#50453c] disabled:opacity-40">Sebelumnya</button>
              {pageNumbers(current, totalPages).map((p, i) =>
                p === "..." ? (
                  <span key={`gap-${i}`} className="w-8 text-center text-[11px] font-medium text-[#50453c]">...</span>
                ) : (
                  <button key={p} type="button" onClick={() => setPage(p)} className={`size-8 rounded-full text-[11px] leading-[14px] ${p === current ? "bg-[#5d3b1e] font-bold text-white" : "bg-white font-medium"}`}>{p}</button>
                ),
              )}
              <button type="button" disabled={current === totalPages} onClick={() => setPage(current + 1)} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-medium leading-[14px] disabled:opacity-40">Selanjutnya</button>
            </div>
          </div>
        </section>

        {/* Catatan */}
        <div className="flex items-start gap-2 rounded-xl bg-[rgba(245,243,239,0.5)] p-4">
          <Icon name="ikon-perisai" w={13.333} h={18.667} />
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-semibold leading-4">Integritas Basis Kata Kunci KOMDIGI</p>
            <p className="text-xs leading-[18px] text-[#50453c]">
              Semua kata kunci yang terdaftar disinkronisasi setiap 15 menit ke mesin deteksi. Kata kunci berstatus aktif akan otomatis dipakai dalam analisis probabilitas dan klasifikasi ancaman domain.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white drop-shadow-[0px_1px_4px_rgba(120,82,51,0.04)]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-6 md:flex-row md:items-center md:justify-between md:px-12">
          <p className="text-xs leading-[18px] text-[#50453c]">© 2026 Kementerian Komunikasi dan Digital (KOMDIGI). Seluruh hak cipta dilindungi.</p>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/about" className="text-xs leading-[18px] text-[#50453c]">Tentang web</Link>
            <Link href="/kebijakan-privasi" className="text-xs leading-[18px] text-[#50453c]">Kebijakan privasi</Link>
            <a href="#" className="flex items-center gap-1 rounded-full bg-[#efeeea] px-4 py-1 text-[11px] font-medium leading-[14px]">
              <Icon name="ikon-dukungan" w={13.333} h={12} />
              Hubungi dukungan
            </a>
          </div>
        </div>
      </footer>

      {/* Modal edit */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-title">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 id="edit-title" className="text-base font-bold leading-6">Edit Kata Kunci</h3>
            <div className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold">Keyword</span>
                <input
                  value={editing.term}
                  maxLength={100}
                  onChange={(e) => setEditing({ ...editing, term: e.target.value })}
                  className="rounded-lg bg-[#f5f3ef] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5d3b1e]/30"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold">Kategori</span>
                <select
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="rounded-lg bg-[#f5f3ef] px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#5d3b1e]/30"
                >
                  {!CATEGORIES.some((c) => c.value === editing.category) && <option value={editing.category}>{editing.category}</option>}
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                Aktif (dipakai mesin deteksi)
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-full bg-[#efeeea] px-4 py-2 text-xs font-semibold">Batal</button>
              <button type="button" onClick={handleSaveEdit} className="rounded-full bg-[#5d3b1e] px-4 py-2 text-xs font-semibold text-white">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
