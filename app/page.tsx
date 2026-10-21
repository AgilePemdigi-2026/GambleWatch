
const features = [
  {
    icon: "◎",
    title: "Web Scraping Engine",
    description:
      "Pengambilan data otomatis dari URL yang ditandai untuk mengekstrak data terstruktur, metadata, dan media yang tertanam untuk dianalisis secara offline.",
  },
  {
    icon: "♧",
    title: "Multi-Modal Detection",
    description:
      "Analisis menggunakan NLP (pemrosesan bahasa) untuk memahami teks dan computer vision untuk mencocokkan kemiripan visual dengan basis data yang telah diketahui mengandung konten ilegal.",
  },
  {
    icon: "♧",
    title: "Compliance & Reporting",
    description:
      "Protokol ekspor data yang terstandardisasi untuk memudahkan integrasi dengan lembaga pemerintah dan basis data penegak hukum.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-[#482b19]">
      <header className="flex flex-col items-center justify-between gap-4 rounded-b-[26px] bg-[#f5efe6] px-6 py-5 md:flex-row">
        <a href="/" className="flex items-center gap-3 text-2xl font-black">
          <span className="text-3xl">◉</span>
          GAMBLEWATCH
        </a>

        <nav className="flex flex-wrap justify-center gap-6 rounded-full bg-white px-8 py-4 text-xs font-black">
          <a href="/">HOME</a>
          <a href="/form-gamblin-analysis">GAMBLING ANALYSIS</a>
          <a href="/feedback">FEEDBACK</a>
        </nav>

        <a
          href="/my-analyses"
          className="rounded-full bg-[#482b19] px-6 py-3 text-xs font-black text-white shadow-md"
        >
          MY ANALYSES
        </a>
      </header>

      <section className="px-5 pb-10 pt-16 md:pt-14">
        <div className="mx-auto max-w-6xl text-center">
          <h1 className="text-4xl font-normal leading-tight md:text-6xl">
            Systematic Intelligent Online
            <br />
            <span className="inline-block -rotate-1 rounded-2xl bg-[#482b19] px-4 py-1 text-white">
              Gambling Detection
            </span>{" "}
            and Reporting
          </h1>

          <p className="mx-auto mt-8 max-w-3xl text-base leading-7 text-[#786b62] md:text-xl">
            GAMBLEWATCH membantu pemangku kepentingan memantau,
            mengambil data, dan mengklasifikasikan domain perjudian
            online ilegal menggunakan teknologi deteksi multi-modal.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-5">
            <a
              href="/sign-up"
              className="rounded-full bg-[#482b19] px-10 py-4 text-xs font-black text-white shadow-lg"
            >
              ♙ &nbsp; SIGN UP
            </a>

            <a
              href="/sign-in"
              className="rounded-full bg-white px-10 py-4 text-xs font-black shadow-md"
            >
              ⇥ &nbsp; SIGN IN
            </a>
          </div>
        </div>
      </section>

      <section id="features" className="px-5 pb-10 pt-8">
        <div className="mb-14 text-center">
          <h2 className="inline-block rounded-full bg-[#482b19] px-8 py-2 text-3xl font-black text-white shadow-md">
            FITUR UTAMA
          </h2>
        </div>

        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-6 md:grid-cols-3 md:gap-5">
          {features.map((feature, index) => (
            <article
              key={feature.title}
              className={`relative min-h-[285px] rounded-[36px] border border-[#f7f4f0] bg-white p-8 transition hover:shadow-md ${
                index === 1 ? "md:mt-10 md:shadow-md" : ""
              }`}
            >
              {index === 1 && (
                <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-[90px] bg-[#f5efe6]" />
              )}

              <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#f5efe6] text-2xl">
                {feature.icon}
              </div>

              <h3 className="relative mb-4 text-xl font-semibold">
                {feature.title}
              </h3>

              <p className="relative text-sm leading-6 text-[#786b62]">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <footer className="rounded-t-[40px] bg-[#f5efe6] px-6 py-7">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 text-sm text-[#786b62] md:flex-row md:items-center">
          <p>
            © 2026 Kementerian Komunikasi dan Digital (KOMDIGI)
          </p>

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
