'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function SignInMasyarakatPage() {
  const [emailNik, setEmailNik] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    console.log('1. Memulai proses login...');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailNik,
        password: password,
      });

      console.log('2. Respon dari Supabase:', { data, error });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        console.log('3. Login berhasil, mencoba redirect...');
        window.location.href = '/form-gamblin-analysis';
      } else {
        setErrorMsg('User tidak ditemukan setelah autentikasi.');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error saat login:', err);
      setErrorMsg(err?.message || 'Terjadi kesalahan tidak terduga.');
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-white text-[#482b19]">
      {/* Navbar */}
      <header className="flex min-h-[88px] flex-wrap items-center justify-between gap-4 rounded-b-[24px] bg-[#f5efe6] px-6 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="GambleWatch Logo"
            width={48}
            height={48}
            className="h-10 w-10 object-contain"
          />
          <span className="text-2xl font-black tracking-wide md:text-3xl">
            GAMBLEWATCH
          </span>
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-5 rounded-full bg-white px-7 py-3 text-xs font-black tracking-wider">
          <Link href="/" className="hover:text-[#a64b20]">HOME</Link>
          <Link href="/gambling-analysis" className="hover:text-[#a64b20]">
            GAMBLING ANALYSIS
          </Link>
          <Link href="/feedback" className="hover:text-[#a64b20]">FEEDBACK</Link>
        </nav>

        <Link
          href="/form-gamblin-analysis"
          className="rounded-full bg-[#482b19] px-7 py-3 text-xs font-black tracking-wider text-white shadow-md hover:bg-[#68432e]"
        >
          MY ANALYSES
        </Link>
      </header>

      {/* Login */}
      <section className="flex flex-1 items-center justify-center px-5 py-16 md:py-20">
        <div className="grid w-full max-w-[900px] overflow-hidden rounded-[32px] bg-[#f5efe6] shadow-sm md:min-h-[535px] md:grid-cols-2">

          {/* Left panel */}
          <div className="flex flex-col justify-center border-b border-[#a99a8c] p-8 md:border-b-0 md:border-r md:p-12">
            <div className="mb-3 text-4xl text-black">♜</div>

            <h1 className="text-3xl font-bold tracking-tight">
              Portal Akses
            </h1>

            <div className="mt-1 flex flex-col gap-4">
              <div className="flex items-center gap-3 rounded-full border border-[#a99a8c] bg-white px-4 py-3">
                <span className="text-xl text-[#a63c0b]">♧</span>
                <span className="text-xs text-[#705e51]">Verifikasi</span>
              </div>

              <div className="flex items-center gap-3 rounded-full border border-[#a99a8c] bg-white px-4 py-3">
                <span className="text-xl text-[#a63c0b]">▤</span>
                <span className="text-xs text-[#705e51]">
                  Analisis Data Real Time
                </span>
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="flex flex-col justify-center p-8 md:p-12">
            <h2 className="text-2xl font-semibold">
              Selamat Datang Kembali
            </h2>
            <p className="mt-2 text-sm text-[#786b61]">
              Pilih jenis akses anda untuk melanjutkan
            </p>

            {/* Account type */}
            <div className="mt-8 flex rounded-full border border-[#a99a8c] p-1">
              <Link
                href="/sign-in/sign-in-masyarakat"
                className="flex-1 rounded-full border border-[#482b19] bg-white py-2 text-center text-xs font-black tracking-wider"
              >
                MASYARAKAT
              </Link>
              <Link
                href="/sign-in/sign-in-admin"
                className="flex-1 rounded-full py-2 text-center text-xs font-black tracking-wider text-[#786b61] hover:text-[#482b19]"
              >
                ADMIN
              </Link>
            </div>

            <form
              className="mt-8 space-y-6"
              onSubmit={handleSignIn}
              suppressHydrationWarning
            >
              {/* Notifikasi Pesan Error */}
              {errorMsg && (
                <div className="rounded-lg bg-red-100 p-3 text-xs font-bold text-red-700">
                  {errorMsg}
                </div>
              )}

              <div>
                <label
                  htmlFor="emailNik"
                  className="mb-2 block text-xs font-black tracking-wider"
                >
                  EMAIL / NIK
                </label>
                <div className="flex items-center gap-3 rounded-full border border-[#a99a8c] bg-white px-4">
                  <span className="text-xl text-[#a63c0b]">♙</span>
                  <input
                    id="emailNik"
                    type="email"
                    required
                    value={emailNik}
                    onChange={(e) => setEmailNik(e.target.value)}
                    placeholder="Masukkan Email kamu"
                    className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-[#96877b]"
                    suppressHydrationWarning
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-xs font-black tracking-wider"
                  >
                    PASSWORD
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs underline hover:text-[#a64b20]"
                  >
                    Forgot?
                  </Link>
                </div>

                <div className="flex items-center gap-3 rounded-full border border-[#a99a8c] bg-white px-4">
                  <span className="text-xl text-[#a63c0b]">♙</span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan Kata Sandi"
                    className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-[#96877b]"
                    suppressHydrationWarning
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-[#786b61]"
                    suppressHydrationWarning
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#482b19] py-3.5 text-xs font-black tracking-wider text-white transition hover:bg-[#68432e] disabled:opacity-50"
                suppressHydrationWarning
              >
                {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE'} <span className="text-lg">→</span>
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-[#51483f]">
              First time reporting?{' '}
              <Link
                href="/sign-up"
                className="font-medium text-black underline"
              >
                Register here
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col items-center justify-between gap-5 rounded-t-[34px] bg-[#f5efe6] px-6 py-7 text-sm text-[#786b61] md:flex-row md:px-8">
        <p>© 2026 Kementerian Komunikasi dan Digital (KOMDIGI)</p>

        <div className="flex flex-wrap items-center justify-center gap-7 text-xs">
          <Link href="/about" className="hover:text-[#482b19]">About Web</Link>
          <Link href="/privacy-policy" className="hover:text-[#482b19]">
            Privacy Policy
          </Link>
          <Link
            href="/contact"
            className="rounded-full bg-white px-5 py-3 hover:text-[#482b19]"
          >
            Contact Support
          </Link>
        </div>
      </footer>
    </main>
  );
}