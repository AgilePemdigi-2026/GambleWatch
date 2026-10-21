
"use client";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f5ef] p-6">
      <section className="w-full max-w-md rounded-3xl bg-[#f5efe5] p-8 shadow-sm">
        <a href="/" className="text-xl font-black text-[#492b19]">
          GAMBLEWATCH
        </a>

        <h1 className="mt-8 text-2xl font-bold text-[#492b19]">
          Selamat Datang Kembali
        </h1>

        <p className="mt-2 text-sm text-[#786b62]">
          Masuk ke akun GAMBLEWATCH Anda
        </p>

        <form
          className="mt-8 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            alert("Form berhasil diuji. Login belum terhubung.");
          }}
        >
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-bold">
              EMAIL / NIK
            </label>
            <input
              id="email"
              type="text"
              placeholder="Masukkan Email atau NIK"
              required
              className="w-full rounded-full border border-[#a08e7f] bg-white px-4 py-3 outline-none"
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
              className="w-full rounded-full border border-[#a08e7f] bg-white px-4 py-3 outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-[#492b19] py-3 font-bold text-white"
          >
            AUTHENTICATE →
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#786b62]">
          First time reporting?{" "}
          <a href="/sign-up" className="underline">
            Register here
          </a>
        </p>
      </section>
    </main>
  );
}
