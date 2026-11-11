
'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();

    setError('');
    setMessage('');

    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak sesuai.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error: updateError } =
        await supabase.auth.updateUser({
          password: password,
        });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setMessage('Password berhasil diperbarui! Silakan login kembali.');

      setTimeout(() => {
        router.push('/sign-in/sign-in-masyarakat');
      }, 2000);

    } catch {
      setError('Terjadi kesalahan. Silakan coba kembali.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f5efe6] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="GambleWatch Logo"
            className="h-16 mx-auto mb-4 object-contain"
          />

          <h1 className="text-2xl font-bold text-[#482b19]">
            Buat Password Baru
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Silakan masukkan password baru untuk akun GambleWatch kamu.
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#482b19] mb-2">
              Password Baru
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password baru"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#482b19]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#482b19] mb-2">
              Konfirmasi Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password baru"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#482b19]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {message && (
            <p className="text-sm text-green-700">{message}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#482b19] py-3 font-semibold text-white hover:bg-[#65402b] disabled:opacity-60"
          >
            {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
          </button>
        </form>
      </div>
    </main>
  );
}
