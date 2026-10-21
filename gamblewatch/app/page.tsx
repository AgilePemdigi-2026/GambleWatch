
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F8F5EF] text-[#38291F]">
      <header className="flex items-center justify-between border-b border-[#E8DED1] px-8 py-5">
        <Link href="/" className="text-2xl font-extrabold">
          <span className="text-[#76533B]">GAMBLE</span>WATCH
        </Link>

        <nav className="flex items-center gap-5 text-sm">
          <Link href="/sign-in">Sign In</Link>
          <Link
            href="/sign-up"
            className="rounded-full bg-[#76533B] px-5 py-3 font-semibold text-white"
          >
            Sign Up
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-8 py-24">
        <p className="font-bold uppercase tracking-[0.2em] text-[#98704E]">
          Online Gambling Awareness
        </p>

        <h1 className="mt-6 max-w-3xl text-5xl font-extrabold leading-tight md:text-7xl">
          Stay Aware.
          <br />
          Stay Protected.
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-8 text-[#786B60]">
          GAMBLEWATCH membantu kamu memeriksa indikasi risiko website yang
          berpotensi berkaitan dengan perjudian online.
        </p>

        <div className="mt-9 flex flex-wrap gap-4">
          <Link
            href="/gambling-analysis"
            className="rounded-xl bg-[#76533B] px-7 py-4 font-bold text-white hover:bg-[#5D402D]"
          >
            Start Analysis →
          </Link>

          <Link
            href="/about"
            className="rounded-xl border border-[#DCCBB9] px-7 py-4 font-bold hover:bg-white"
          >
            Learn More
          </Link>
        </div>

        <div className="mt-20 grid gap-5 md:grid-cols-3">
          {[
            {
              title: "Website Analysis",
              description:
                "Periksa URL untuk mencari indikasi risiko website.",
            },
            {
              title: "Image Analysis",
              description:
                "Siapkan gambar atau screenshot sebagai input analisis.",
            },
            {
              title: "Analysis History",
              description:
                "Rencanakan akses untuk melihat riwayat hasil pemeriksaan.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-[#E8DED1] bg-white p-7"
            >
              <h2 className="text-xl font-bold">{item.title}</h2>
              <p className="mt-3 leading-7 text-[#786B60]">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#E8DED1] px-8 py-6 text-center text-sm text-[#88796D]">
        © 2026 GAMBLEWATCH
      </footer>
    </main>
  );
}
