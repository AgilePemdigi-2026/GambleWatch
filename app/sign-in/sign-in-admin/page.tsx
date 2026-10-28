'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function SignInAdminPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const router = useRouter();

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // 1. Autentikasi ke Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    // 2. Cek apakah user memiliki role 'admin' di user_metadata atau app_metadata
    const userRole = data.user?.user_metadata?.role || data.user?.app_metadata?.role;

    if (userRole !== 'admin') {
      // Logout otomatis jika masyarakat biasa mencoba login dari portal Admin
      await supabase.auth.signOut();
      setErrorMsg('Akses ditolak! Akun ini bukan akun Admin.');
      setLoading(false);
      return;
    }

    // 3. Jika terverifikasi Admin, redirect langsung ke dashboard admin (/admin)
    if (data.user) {
      router.push('/admin');
    }

    setLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col bg-white text-[#482b19]">
      {/* Navbar */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-b-[26px] bg-[#f5efe6] px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-3xl">◉</span>
          <span className="text-2xl font-black tracking-wide">
            GAMBLEWATCH
          </span>
        </Link>

        <nav className="flex flex-wrap justify-center gap-5 rounded-full bg-white px-6 py-4 text-xs font-black">
          <Link href="/">HOME</Link>
          <Link href="/form-gamblin-analysis">
            GAMBLING ANALYSIS
          </Link>
          <Link href="/feedback">FEEDBACK</Link>
        </nav>

        <Link
          href="/sign-in/sign-in-masyarakat"
          className="rounded-full bg-[#482b19] px-6 py-3 text-xs font-black text-white"
        >
          MY ANALYSES
        </Link>
      </header>

      {/* Login Panel */}
      <section className="flex flex-1 items-center justify-center px-5 py-14">
        <div className="grid w-full max-w-[900px] overflow-hidden rounded-[32px] bg-[#f5efe6] shadow-sm md:min-h-[510px] md:grid-cols-2">
          {/* Left Panel */}
          <div className="flex flex-col justify-center border-b border-[#a99a8c] p-8 md:border-b-0 md:border-r md:p-12">
            <div className="mb-3 text-4xl text-black">⬟</div>

            <h1 className="text-3xl font-bold">
              Portal Akses Admin
            </h1>

            <div className="mt-1 space-y-4">
              <div className="flex items-center gap-3 rounded-full border border-[#a99a8c] bg-white px-4 py-3">
                <span className="text-xl text-[#a63c0b]">♧</span>
                <span className="text-xs text-[#705e51]">
                  Verifikasi Otoritas
                </span>
              </div>

              <div className="flex items-center gap-3 rounded-full border border-[#a99a8c] bg-white px-4 py-3">
                <span className="text-xl text-[#a63c0b]">▤</span>
                <span className="text-xs text-[#705e51]">
                  Manajemen & Analisis Laporan
                </span>
              </div>
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex flex-col justify-center p-8 md:p-12">
            <h2 className="text-2xl font-semibold">
              Selamat Datang Kembali
            </h2>

            <p className="mt-2 text-sm text-[#786b61]">
              Masuk dengan akun administrator Anda
            </p>

            {/* Switch Account */}
            <div className="mt-8 flex rounded-full border border-[#a99a8c] p-1">
              <Link
                href="/sign-in/sign-in-masyarakat"
                className="flex-1 rounded-full py-2 text-center text-xs font-black text-[#786b61] hover:text-[#482b19]"
              >
                MASYARAKAT
              </Link>

              <Link
                href="/sign-in/sign-in-admin"
                className="flex-1 rounded-full border border-[#a99a8c] bg-white py-2 text-center text-xs font-black"
              >
                ADMIN
              </Link>
            </div>

            <form
              className="mt-8 space-y-6"
              onSubmit={handleAdminSignIn}
              suppressHydrationWarning
            >
              {/* Notifikasi Pesan Error */}
              {errorMsg && (
                <div className="rounded-lg bg-red-100 p-3 text-xs text-red-700">
                  {errorMsg}
                </div>
              )}

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-xs font-black tracking-wider"
                >
                  EMAIL ADMIN
                </label>

                <div className="flex items-center gap-3 rounded-full border border-[#a99a8c] bg-white px-4">
                  <span className="text-xl text-[#a63c0b]">♙</span>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="Masukkan Email Admin"
                    required
                    className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-[#96877b]"
                    suppressHydrationWarning
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-xs font-black tracking-wider"
                >
                  PASSWORD
                </label>

                <div className="flex items-center gap-3 rounded-full border border-[#a99a8c] bg-white px-4">
                  <span className="text-xl text-[#a63c0b]">♙</span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Masukkan Kata Sandi"
                    required
                    className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-[#96877b]"
                    suppressHydrationWarning
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    className="text-xs text-[#786b61]"
                    suppressHydrationWarning
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#482b19] py-3.5 text-xs font-black text-white transition hover:bg-[#68432e] disabled:opacity-50"
                suppressHydrationWarning
              >
                {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE'} <span className="text-lg">→</span>
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col items-center justify-between gap-5 rounded-t-[34px] bg-[#f5efe6] px-6 py-7 text-sm text-[#786b61] md:flex-row">
        <p>
          © 2026 Kementerian Komunikasi dan Digital (KOMDIGI)
        </p>

        <div className="flex flex-wrap items-center justify-center gap-6 text-xs">
          <Link href="/about">About Web</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link
            href="/contact"
            className="rounded-full bg-white px-5 py-3"
          >
            Contact Support
          </Link>
        </div>
      </footer>
    </main>
  );
}