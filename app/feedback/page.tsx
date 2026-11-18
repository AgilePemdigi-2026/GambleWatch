"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const KATEGORI_CARDS = [
  {
    value: "Laporan Bug",
    label: "Laporan Bug",
    icon: "🐞",
  },
  {
    value: "Saran Fitur",
    label: "Saran Fitur",
    icon: "💡",
  },
  {
    value: "Laporan Data",
    label: "Laporan Data",
    icon: "⚑",
  },
];

export default function FeedbackPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [namaPengirim, setNamaPengirim] = useState("");
  const [isAnonim, setIsAnonim] = useState(false);
  const [email, setEmail] = useState("");
  const [kategori, setKategori] = useState("Saran Fitur");
  const [pesanMasukan, setPesanMasukan] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // REQ-1: Otomatis mengisi email & user_id jika pengguna sedang login
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
          if (user.email) setEmail(user.email);
        }
      } catch {
        // Tetap izinkan akses publik jika belum login
      }
    };

    fetchUser();
  }, []);

  const handleAnonimChange = (checked: boolean) => {
    setIsAnonim(checked);
    if (checked) {
      setNamaPengirim("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!pesanMasukan.trim()) {
      setStatusMessage({
        type: "error",
        text: "Pesan masukan wajib diisi.",
      });
      return;
    }

    if (pesanMasukan.length > 500) {
      setStatusMessage({
        type: "error",
        text: "Pesan masukan maksimal 500 karakter.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          nama_pengirim: namaPengirim,
          is_anonim: isAnonim,
          email,
          kategori,
          pesan_masukan: pesanMasukan,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal mengirim feedback.");
      }

      // REQ-7: "Terima kasih, masukan Anda berhasil dikirim!"
      setStatusMessage({
        type: "success",
        text: result.message,
      });

      // Reset form setelah berhasil dikirim
      setNamaPengirim("");
      setIsAnonim(false);
      if (!userId) setEmail("");
      setKategori("Saran Fitur");
      setPesanMasukan("");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengirim feedback.";
      setStatusMessage({
        type: "error",
        text: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white text-[#482b19]">
      {/* Navbar (Sesuai Gambar 3.8 & Home) */}
      <header className="flex flex-col items-center justify-between gap-4 rounded-b-[26px] bg-[#f5efe6] px-6 py-5 md:flex-row">
        <a href="/" className="flex items-center gap-3 text-2xl font-black">
          <span className="text-3xl">◉</span>
          GAMBLEWATCH
        </a>

        <nav className="flex flex-wrap justify-center gap-6 rounded-full bg-white px-8 py-4 text-xs font-black">
          <a href="/" className="transition hover:text-[#68432e]">
            HOME
          </a>
          <a
            href="/form-gamblin-analysis"
            className="transition hover:text-[#68432e]"
          >
            GAMBLING ANALYSIS
          </a>
          <a
            href="/feedback"
            className="rounded-full bg-[#482b19] px-4 py-1 text-white"
          >
            FEEDBACK
          </a>
        </nav>

        <a
          href="/sign-in/sign-in-masyarakat"
          className="rounded-full bg-[#482b19] px-6 py-3 text-xs font-black text-white shadow-md transition hover:bg-[#68432e]"
        >
          MY ANALYSES
        </a>
      </header>

      {/* Main Content (Sesuai High-Fidelity Mockup Gambar 3.8) */}
      <section className="px-5 pb-20 pt-14">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-black tracking-tight text-[#482b19] md:text-4xl">
            FEEDBACK
          </h1>
          <p className="mt-1 text-xs text-[#786b62]">
            * Semua kolom wajib diisi kecuali ditandai opsional.
          </p>

          {/* Notifikasi Sukses / Error */}
          {statusMessage && (
            <div
              className={`mt-6 rounded-2xl px-5 py-4 text-sm font-medium ${
                statusMessage.type === "success"
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border border-red-200 bg-red-50 text-red-900"
              }`}
            >
              {statusMessage.type === "success" ? "✓ " : "⚠ "}
              {statusMessage.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-6">
            {/* Badge IDENTITAS PELAPOR */}
            <div>
              <span className="inline-block rounded-full border border-[#482b19] px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-[#482b19]">
                IDENTITAS PELAPOR
              </span>

              {/* Nama Lengkap (Opsional) + Checkbox Kirim sebagai Anonim */}
              <div className="mt-4">
                <label
                  htmlFor="nama_pengirim"
                  className="mb-2 block text-xs font-bold text-[#482b19]"
                >
                  Nama Lengkap (Opsional)
                </label>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    id="nama_pengirim"
                    type="text"
                    maxLength={100}
                    disabled={isAnonim}
                    value={namaPengirim}
                    onChange={(e) => setNamaPengirim(e.target.value)}
                    placeholder="Masukkan nama Anda..."
                    className="w-full flex-1 rounded-full border border-[#d8cec2] bg-white px-5 py-3 text-sm text-[#482b19] placeholder-[#a89c93] outline-none transition focus:border-[#482b19] disabled:bg-[#f5efe6]/60 disabled:text-[#a89c93]"
                  />

                  <label className="flex cursor-pointer select-none items-center gap-2 text-xs font-semibold text-[#482b19]">
                    <input
                      type="checkbox"
                      checked={isAnonim}
                      onChange={(e) => handleAnonimChange(e.target.checked)}
                      className="h-4 w-4 rounded border-[#482b19] accent-[#482b19]"
                    />
                    Kirim sebagai Anonim
                  </label>
                </div>
              </div>

              {/* Email (REQ-1: otomatis terisi jika login atau dapat diisi manual) */}
              <div className="mt-4">
                <label
                  htmlFor="email"
                  className="mb-2 block text-xs font-bold text-[#482b19]"
                >
                  Email (Opsional)
                </label>
                <input
                  id="email"
                  type="email"
                  maxLength={100}
                  disabled={isAnonim}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Masukkan email Anda..."
                  className="w-full rounded-full border border-[#d8cec2] bg-white px-5 py-3 text-sm text-[#482b19] placeholder-[#a89c93] outline-none transition focus:border-[#482b19] disabled:bg-[#f5efe6]/60 disabled:text-[#a89c93]"
                />
              </div>
            </div>

            {/* Kategori Feedback (3 Tombol Kartu sesuai Gambar 3.8) */}
            <div>
              <label className="mb-3 block text-xs font-bold text-[#482b19]">
                Kategori Feedback
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {KATEGORI_CARDS.map((item) => {
                  const isSelected = kategori === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setKategori(item.value)}
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border px-4 py-4 text-center transition ${
                        isSelected
                          ? "border-[#482b19] bg-[#f5efe6] font-bold text-[#482b19] shadow-sm"
                          : "border-[#d8cec2] bg-white font-medium text-[#786b62] hover:border-[#482b19]/50"
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-xs">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pesan Masukan (Max 500 karakter sesuai Gambar 3.8 & SRS 3.4e) */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="pesan_masukan"
                  className="block text-xs font-bold text-[#482b19]"
                >
                  Pesan Masukan
                </label>
                <span className="text-[11px] text-[#786b62]">
                  {pesanMasukan.length}/500 karakter (Max 500 karakter)
                </span>
              </div>
              <textarea
                id="pesan_masukan"
                rows={5}
                maxLength={500}
                required
                value={pesanMasukan}
                onChange={(e) => setPesanMasukan(e.target.value)}
                placeholder="Jelaskan secara detail masalah atau saran Anda di sini..."
                className="w-full rounded-2xl border border-[#d8cec2] bg-white p-4 text-sm leading-6 text-[#482b19] placeholder-[#a89c93] outline-none transition focus:border-[#482b19]"
              />
            </div>

            {/* Tombol KIRIM FEEDBACK di kanan bawah sesuai Gambar 3.8 */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="rounded-full bg-[#482b19] px-8 py-3.5 text-xs font-black tracking-wider text-white shadow-md transition hover:bg-[#68432e] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "MENGIRIM..." : "KIRIM FEEDBACK"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Footer (Sesuai Gambar 3.8 & Home) */}
      <footer className="rounded-t-[40px] bg-[#f5efe6] px-6 py-7">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 text-sm text-[#786b62] md:flex-row md:items-center">
          <p>© 2026 Kementerian Komunikasi dan Digital (KOMDIGI)</p>

          <div className="flex flex-wrap items-center gap-6">
            <a href="/about">About Web</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="/contact" className="rounded-full bg-white px-5 py-3">
              Contact Support
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}