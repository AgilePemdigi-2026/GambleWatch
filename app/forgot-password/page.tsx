'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setMessage('Tautan untuk mereset kata sandi telah dikirim ke email kamu. Cek kotak masuk/spam ya!');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-white text-[#482b19]">
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
      </header>

      <section className="flex flex-1 items-center justify-center px-5 py-16 md:py-20">
        <div className="w-full max-w-[500px] rounded-[32px] bg-[#f5efe6] p-8 shadow-sm md:p-12">
          <h1 className="text-2xl font-bold">Lupa Kata Sandi?</h1>
          <p className="mt-2 text-sm text-[#786b61]">
            Masukkan email yang terdaftar. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi kamu.
          </p>

          <form className="mt-6 space-y-5" onSubmit={handleResetPassword}>
            {errorMsg && (
              <div className="rounded-lg bg-red-100 p-3 text-xs font-bold text-red-700">
                {errorMsg}
              </div>
            )}

            {message && (
              <div className="rounded-lg bg-green-100 p-3 text-xs font-bold text-green-700">
                {message}
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-2 block text-xs font-black tracking-wider">
                EMAIL TERDAFTAR
              </label>
              <div className="flex items-center gap-3 rounded-full border border-[#a99a8c] bg-white px-4 py-1">
                <span className="text-xl text-[#a63c0b]">✉</span>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Masukkan Email kamu"
                  className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-[#96877b]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#482b19] py-3.5 text-xs font-black tracking-wider text-white transition hover:bg-[#68432e] disabled:opacity-50"
            >
              {loading ? 'SENDING...' : 'KIRIM TAUTAN RESET'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#51483f]">
            Kirim ulang atau kembali ke{' '}
            <Link href="/sign-in/sign-in-masyarakat" className="font-bold underline">
              Halaman Log In
            </Link>
          </p>
        </div>
      </section>

      <footer className="flex items-center justify-center rounded-t-[34px] bg-[#f5efe6] px-6 py-6 text-xs text-[#786b61]">
        <p>© 2026 Kementerian Komunikasi dan Digital (KOMDIGI)</p>
      </footer>
    </main>
  );
}