
'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type AuthFormProps = {
  mode: 'sign-in' | 'sign-up';
  title: string;
  subtitle: string;
  identifierLabel?: string;
  identifierPlaceholder?: string;
  footer?: ReactNode;
  defaultRole?: 'masyarakat' | 'admin';
};

const inputClass =
  'w-full rounded-full border border-[#a08e7f] bg-white px-4 py-3 outline-none focus:border-[#492b19]';

export default function AuthForm({
  mode,
  title,
  subtitle,
  identifierPlaceholder = 'Masukkan Email',
  footer,
  defaultRole = 'masyarakat',
}: AuthFormProps) {
  const isSignUp = mode === 'sign-up';
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const supabase = createClient();

      const email = identifier.trim().toLowerCase();

      if (!email || !password) {
        setErrorMsg('Email dan password wajib diisi.');
        return;
      }

      if (isSignUp) {
        if (defaultRole === 'admin') {
          setErrorMsg(
            'Pendaftaran admin harus dilakukan melalui administrator.'
          );
          return;
        }

        if (!fullName.trim()) {
          setErrorMsg('Nama lengkap wajib diisi.');
          return;
        }

        if (password.length < 8) {
          setErrorMsg('Password minimal 8 karakter.');
          return;
        }

        if (password !== confirmPassword) {
          setErrorMsg('Konfirmasi password tidak cocok.');
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
            emailRedirectTo: `${window.location.origin}/sign-in/sign-in-masyarakat`,
          },
        });

        if (error) throw error;

        if (data.session) {
          setSuccessMsg('Pendaftaran berhasil! Mengalihkan ke halaman login...');

          router.replace('/sign-in/sign-in-masyarakat');
          router.refresh();
        } else {
          setSuccessMsg(
            'Pendaftaran berhasil! Silakan periksa email untuk melakukan konfirmasi akun sebelum login.'
          );
        }

        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error('Email atau password salah.');
      }

      const userRole = data.user.app_metadata?.role;

      if (defaultRole === 'admin' && userRole !== 'admin') {
        await supabase.auth.signOut();
        throw new Error('Akun ini bukan akun administrator.');
      }

      if (defaultRole === 'masyarakat' && userRole === 'admin') {
        await supabase.auth.signOut();
        throw new Error(
          'Silakan masuk melalui halaman login administrator.'
        );
      }

      if (userRole === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/form-gamblin-analysis');
      }

      router.refresh();

    } catch (error) {
      console.error('Authentication error:', error);

      setErrorMsg(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat menghubungkan ke server.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f5ef] p-6">
      <section className="w-full max-w-md rounded-3xl bg-[#f5efe5] p-8 shadow-sm">

        <Link href="/" className="text-xl font-black text-[#492b19]">
          GAMBLEWATCH
        </Link>

        <h1 className="mt-8 text-2xl font-bold text-[#492b19]">
          {title}
        </h1>

        <p className="mt-2 text-sm text-[#786b62]">
          {subtitle}
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl bg-red-100 p-3 text-xs text-red-700"
            >
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="rounded-xl bg-green-100 p-3 text-xs text-green-700"
            >
              {successMsg}
            </div>
          )}

          {isSignUp && (
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-bold">
                NAMA LENGKAP
              </label>

              <input
                id="name"
                type="text"
                placeholder="Masukkan Nama Lengkap"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label htmlFor="identifier" className="mb-2 block text-sm font-bold">
              EMAIL
            </label>

            <input
              id="identifier"
              type="email"
              placeholder={identifierPlaceholder}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="email"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-bold">
              PASSWORD
            </label>

            <input
              id="password"
              type="password"
              placeholder="Masukkan Kata Sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              required
              minLength={isSignUp ? 8 : undefined}
              className={inputClass}
            />
          </div>

          {isSignUp && (
            <div>
              <label htmlFor="confirm" className="mb-2 block text-sm font-bold">
                KONFIRMASI PASSWORD
              </label>

              <input
                id="confirm"
                type="password"
                placeholder="Ulangi Kata Sandi"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className={inputClass}
              />
            </div>
          )}

          {!isSignUp && (
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-xs font-bold text-[#a63c0b] underline"
              >
                Lupa Kata Sandi?
              </Link>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#492b19] py-3 font-bold text-white transition hover:bg-[#68432e] disabled:opacity-50"
          >
            {loading
              ? 'MEMPROSES...'
              : isSignUp
                ? 'DAFTAR →'
                : 'MASUK →'}
          </button>

        </form>

        {footer && (
          <p className="mt-6 text-center text-sm text-[#786b62]">
            {footer}
          </p>
        )}

      </section>
    </main>
  );
}
