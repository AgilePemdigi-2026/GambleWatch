"use client";

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

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f5ef] p-6">
      <section className="w-full max-w-md rounded-3xl bg-[#f5efe5] p-8 shadow-sm">
        <a href="/" className="text-xl font-black text-[#492b19]">
          GAMBLEWATCH
        </a>

        <h1 className="mt-8 text-2xl font-bold text-[#492b19]">{title}</h1>
        <p className="mt-2 text-sm text-[#786b62]">{subtitle}</p>

        <form
          className="mt-8 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            alert("Form berhasil diuji. Autentikasi belum terhubung.");
          }}
        >
          {isSignUp && (
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-bold">
                NAMA LENGKAP
              </label>
              <input
                id="name"
                type="text"
                placeholder="Masukkan Nama Lengkap"
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
                required
                className={inputClass}
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-full bg-[#492b19] py-3 font-bold text-white"
          >
            {isSignUp ? "DAFTAR →" : "MASUK →"}
          </button>
        </form>

        {footer && (
          <p className="mt-6 text-center text-sm text-[#786b62]">{footer}</p>
        )}
      </section>
    </main>
  );
}
