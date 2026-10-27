export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col bg-white text-[#482b19]">
      <header className="flex flex-col items-center justify-between gap-4 rounded-b-[26px] bg-[#f5efe6] px-6 py-5 md:flex-row">
        <a href="/" className="flex items-center gap-3 text-2xl font-black">
          <span className="text-3xl">ðŸ›¡ï¸</span>
          GAMBLEWATCH
        </a>

        <nav className="flex flex-wrap justify-center gap-6 rounded-full bg-white px-8 py-4 text-xs font-black">
          <a href="/">HOME</a>
          <a href="/gambling-analysis">GAMBLING ANALYSIS</a>
          <a href="/feedback">FEEDBACK</a>
        </nav>

        <a
          href="/my-analyses"
          className="rounded-full bg-[#482b19] px-6 py-3 text-xs font-black text-white shadow-md"
        >
          MY ANALYSES
        </a>
      </header>

      <section className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-3xl rounded-[32px] bg-[#f5efe6] p-8 sm:p-12">
          <div className="text-center">
            <span className="text-5xl">ðŸ›¡ï¸</span>

            <h1 className="mt-5 text-3xl font-bold sm:text-4xl">
              Selamat Datang
            </h1>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#786b62] sm:text-base">
              Pilih jenis akses yang sesuai untuk melanjutkan
              ke portal GAMBLEWATCH.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <a
              href="/sign-in/sign-in-masyarakat"
              className="group rounded-[24px] border border-[#e4d8ca] bg-white p-7 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5efe6] text-3xl">
                â™™
              </div>

              <h2 className="mt-5 text-xl font-bold">Masyarakat</h2>

              <p className="mt-3 text-sm leading-6 text-[#786b62]">
                Masuk untuk melakukan analisis website,
                melaporkan situs mencurigakan, dan melihat hasil pemeriksaan.
              </p>

              <div className="mt-6 font-bold">
                Sign In Masyarakat â†’
              </div>
            </a>

            <a
              href="/sign-in/sign-in-admin"
              className="group rounded-[24px] border border-[#e4d8ca] bg-white p-7 transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5efe6] text-3xl">
                â™œ
              </div>

              <h2 className="mt-5 text-xl font-bold">Administrator</h2>

              <p className="mt-3 text-sm leading-6 text-[#786b62]">
                Masuk ke portal administrator untuk memantau,
                memverifikasi, dan mengelola laporan situs.
              </p>

              <div className="mt-6 font-bold">
                Sign In Admin â†’
              </div>
            </a>
          </div>

          <p className="mt-8 text-center text-sm text-[#786b62]">
            Belum memiliki akun masyarakat?{" "}
            <a href="/sign-up" className="font-bold underline">
              Daftar di sini
            </a>
          </p>

          <div className="mt-5 text-center">
            <a href="/" className="text-sm underline">
              â† Kembali ke Home
            </a>
          </div>
        </div>
      </section>

      <footer className="rounded-t-[36px] bg-[#f5efe6] px-5 py-6">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 text-sm text-[#786b62] md:flex-row md:items-center">
          <p>Â© 2026 Kementerian Komunikasi dan Digital (KOMDIGI)</p>

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