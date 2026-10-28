"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

type AuthFormProps = {
  mode: "sign-in" | "sign-up";
  title: string;
  subtitle: string;
  identifierLabel?: string;
  identifierPlaceholder?: string;
  footer?: React.ReactNode;
};

const inputClass =
  "w-full rounded-full border border-[#a08e7f] bg-white px-4 py-3 outline-none";

export default function AuthForm({
  mode,
  title,
  subtitle,
  identifierLabel = "EMAIL / NIK",
  identifierPlaceholder = "Masukkan Email atau NIK",
  footer,
}: AuthFormProps) {
  const isSignUp = mode === "sign-up";
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    if (isSignUp) {
      if (password !== confirmPassword) {
        setErrorMsg("Konfirmasi password tidak cocok!");
        setLoading(false);
        return;
      }

      // Panggil Supabase SignUp
      const { data, error } = await supabase.auth.signUp({
        email: identifier,
        password: password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        setSuccessMsg("Pendaftaran berhasil! Silakan cek email kamu atau langsung coba login.");
      }
    } else {
      // Panggil Supabase SignIn
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier,
        password: password,
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        router.push("/");
      }
    }

    setLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f5ef] p-6">
      <section className="w-full max-w-md rounded-3xl bg-[#f5efe5] p-8 shadow-sm">
        <a href="/" className="text-xl font-black text-[#492b19]">
          GAMBLEWATCH
        </a>

        <h1 className="mt-8 text-2xl font-bold text-[#492b19]">{title}</h1>
        <p className="mt-2 text-sm text-[#786b62]">{subtitle}</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {errorMsg && (
            <div className="rounded-xl bg-red-100 p-3 text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl bg-green-100 p-3 text-xs text-green-700">
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
              {identifierLabel}
            </label>
            <input
              id="identifier"
              type="text"
              placeholder={identifierPlaceholder}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
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
              required
              minLength={isSignUp ? 8 : undefined}
              className={inputClass}
            />
          </div>

          {isSignUp && (
            <div>
              <label
                htmlFor="confirm"
                className="mb-2 block text-sm font-bold"
              >
                KONFIRMASI PASSWORD
              </label>
              <input
                id="confirm"
                type="password"
                placeholder="Ulangi Kata Sandi"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className={inputClass}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[#492b19] py-3 font-bold text-white transition hover:bg-[#68432e] disabled:opacity-50"
          >
            {loading
              ? "MEMPROSES..."
              : isSignUp
              ? "DAFTAR →"
              : "MASUK →"}
          </button>
        </form>

        {footer && (
          <p className="mt-6 text-center text-sm text-[#786b62]">{footer}</p>
        )}
      </section>
    </main>
  );
}