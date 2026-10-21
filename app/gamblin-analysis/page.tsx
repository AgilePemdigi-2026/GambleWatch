
"use client";

import Link from "next/link";
import { useState } from "react";

export default function GamblingAnalysisPage() {
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(selectedFile.type)) {
      setMessage("Gunakan file gambar JPG, PNG, atau WEBP.");
      event.target.value = "";
      setFile(null);
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setMessage("Ukuran gambar maksimal 5 MB.");
      event.target.value = "";
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setMessage("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!url.trim() && !file) {
      setMessage("Masukkan URL atau unggah gambar terlebih dahulu.");
      return;
    }

    if (url.trim()) {
      try {
        const parsedUrl = new URL(url.trim());

        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          setMessage("URL harus menggunakan HTTP atau HTTPS.");
          return;
        }
      } catch {
        setMessage("Format URL belum benar. Contoh: https://example.com");
        return;
      }
    }

    // Show analyzing message
    setMessage("🔍 Menganalisis website...");

    try {
      // Dynamically import our detection module
      const detection = await import('@/lib/detection');

      if (url.trim()) {
        // DET-01: URL Pattern Detection
        const urlResult = detection.analyzeURL(url.trim());

        if (urlResult.isGambling) {
          setMessage(`❌ DETECTED: ${urlResult.details} (${urlResult.confidence}% confidence)`);
        } else {
          setMessage(`✅ SAFE: ${urlResult.details} (${urlResult.confidence}% confidence)`);
        }

        // Show more details in console for debugging
        console.log('URL Analysis Result:', urlResult);

      } else if (file) {
        // TODO: DET-02 & DET-03: OCR Detection
        setMessage("📷 OCR detection (DET-02 & DET-03) coming soon. URL analysis is available now.");
      }

    } catch (error) {
      console.error('Error in analysis:', error);
      setMessage("⚠️ Error in analysis system. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-[#F8F5EF] text-[#38291F]">
      {/* Navbar */}
      <header className="border-b border-[#E8DED1] bg-[#F8F5EF]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-extrabold tracking-tight">
            <span className="text-[#76533B]">GAMBLE</span>
            <span className="text-[#38291F]">WATCH</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
            <Link href="/" className="transition hover:text-[#98704E]">
              Home
            </Link>
            <Link
              href="/gambling-analysis"
              className="border-b-2 border-[#76533B] pb-1 text-[#76533B]"
            >
              Gambling Analysis
            </Link>
            <Link
              href="/my-analyses"
              className="transition hover:text-[#98704E]"
            >
              My Analyses
            </Link>
            <Link href="/about" className="transition hover:text-[#98704E]">
              About Us
            </Link>
          </nav>

          <Link
            href="/sign-in"
            className="rounded-full bg-[#76533B] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5D402D]"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main content */}
      <section className="mx-auto max-w-5xl px-6 py-14 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full border border-[#E2D2C0] bg-[#F0E7DA] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#76533B]">
            Website Risk Analysis
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            Check Before You Trust
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#786B60] md:text-lg">
            Periksa indikasi risiko pada website yang mencurigakan melalui
            URL atau gambar. Hasil pemeriksaan nantinya dapat membantu kamu
            mengenali potensi aktivitas perjudian online.
          </p>
        </div>

        {/* Analysis form */}
        <div className="mx-auto mt-12 max-w-3xl rounded-3xl border border-[#E8DED1] bg-white p-6 shadow-[0_12px_40px_rgba(56,41,31,0.06)] md:p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* URL input */}
            <div>
              <label
                htmlFor="website-url"
                className="mb-3 block text-base font-bold"
              >
                1. Enter Website URL
              </label>

              <p className="mb-4 text-sm leading-6 text-[#88796D]">
                Masukkan alamat website yang ingin diperiksa.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="website-url"
                  type="url"
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setMessage("");
                  }}
                  placeholder="https://example.com"
                  className="min-w-0 flex-1 rounded-xl border border-[#E3D8CC] bg-[#FCFAF7] px-4 py-3.5 text-sm outline-none transition placeholder:text-[#B3A79B] focus:border-[#98704E] focus:ring-2 focus:ring-[#98704E]/15"
                />

                <button
                  type="button"
                  onClick={() => {
                    if (url.trim()) {
                      setMessage(
                        "URL sudah dimasukkan. Tekan Analyze untuk melanjutkan pemeriksaan input."
                      );
                    } else {
                      setMessage("Masukkan URL website terlebih dahulu.");
                    }
                  }}
                  className="rounded-xl border border-[#76533B] px-6 py-3.5 text-sm font-bold text-[#76533B] transition hover:bg-[#F8F1E8]"
                >
                  Check URL
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-[#EDE4DA]" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[#A39385]">
                Or
              </span>
              <div className="h-px flex-1 bg-[#EDE4DA]" />
            </div>

            {/* Image upload */}
            <div>
              <label
                htmlFor="website-image"
                className="mb-3 block text-base font-bold"
              >
                2. Upload Website Screenshot
              </label>

              <p className="mb-4 text-sm leading-6 text-[#88796D]">
                Unggah tangkapan layar website jika kamu ingin menggunakan
                gambar sebagai input pemeriksaan.
              </p>

              <label
                htmlFor="website-image"
                className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-[#DCCBB9] bg-[#FCFAF7] px-5 py-10 text-center transition hover:border-[#98704E] hover:bg-[#F8F1E8]"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFE4D6] text-[#76533B]">
                  <svg
                    viewBox="0 0 24 24"
                    width="28"
                    height="28"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 16V4" />
                    <path d="m7 9 5-5 5 5" />
                    <path d="M4 16.5v2A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5v-2" />
                  </svg>
                </div>

                <span className="text-sm font-bold">
                  {file ? "Change image" : "Click to upload an image"}
                </span>

                <span className="mt-2 text-xs text-[#9A8B7E]">
                  JPG, PNG, or WEBP · Maximum 5 MB
                </span>

                <input
                  id="website-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {file && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#E8DED1] bg-[#FCFAF7] p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {file.name}
                    </p>
                    <p className="mt-1 text-xs text-[#88796D]">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="shrink-0 rounded-lg px-3 py-2 text-sm font-semibold text-[#9B5143] hover:bg-[#F7EAE5]"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Notice */}
            <div className="rounded-xl border border-[#E9DCC9] bg-[#F9F3E9] p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-lg" aria-hidden="true">
                  ⓘ
                </span>
                <div>
                  <p className="text-sm font-bold">Important information</p>
                  <p className="mt-1 text-sm leading-6 text-[#786B60]">
                    Pada versi ini, URL dan gambar hanya divalidasi di
                    antarmuka. Hasil pemeriksaan risiko belum dapat ditentukan
                    sampai modul analisis diimplementasikan.
                  </p>
                </div>
              </div>
            </div>

            {/* Message */}
            {message && (
              <div
                role="status"
                className="rounded-xl border border-[#E3D8CC] bg-[#FCFAF7] p-4 text-sm leading-6 text-[#76533B]"
              >
                {message}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="w-full rounded-xl bg-[#76533B] px-6 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#5D402D] focus:outline-none focus:ring-4 focus:ring-[#98704E]/20"
            >
              Analyze Website
            </button>
          </form>
        </div>

        {/* Steps */}
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-[#E8DED1] bg-white p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFE4D6] font-extrabold text-[#76533B]">
              01
            </div>
            <h2 className="font-bold">Submit Input</h2>
            <p className="mt-2 text-sm leading-6 text-[#88796D]">
              Masukkan URL website atau pilih gambar untuk diperiksa.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E8DED1] bg-white p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFE4D6] font-extrabold text-[#76533B]">
              02
            </div>
            <h2 className="font-bold">Analyze Indicators</h2>
            <p className="mt-2 text-sm leading-6 text-[#88796D]">
              Modul analisis nantinya memeriksa indikator risiko yang relevan.
            </p>
          </div>

          <div className="rounded-2xl border border-[#E8DED1] bg-white p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#EFE4D6] font-extrabold text-[#76533B]">
              03
            </div>
            <h2 className="font-bold">Review Results</h2>
            <p className="mt-2 text-sm leading-6 text-[#88796D]">
              Tinjau hasil analisis setelah fitur deteksi selesai dibuat.
            </p>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="text-sm font-semibold text-[#76533B] transition hover:text-[#98704E]"
          >
            ← Back to Home
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E8DED1] px-6 py-7">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-center text-xs text-[#96877A] md:flex-row md:text-left">
          <p>© 2026 GAMBLEWATCH. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/about" className="hover:text-[#76533B]">
              About Us
            </Link>
            <Link href="/privacy-policy" className="hover:text-[#76533B]">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
