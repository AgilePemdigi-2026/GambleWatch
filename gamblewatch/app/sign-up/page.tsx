
import Link from "next/link";

const features = [
  {
    icon: "◎",
    title: "Web Scraping Engine",
    description:
      "Pengambilan data otomatis dari URL yang ditandai untuk mengekstrak data terstruktur, metadata, dan media yang tertanam untuk dianalisis secara offline.",
    className: "md:mt-0",
  },
  {
    icon: "♧",
    title: "Multi-Modal Detection",
    description:
      "Analisis menggunakan NLP (pemrosesan bahasa) untuk memahami teks dan computer vision untuk mencocokkan kemiripan visual dengan basis data yang telah diketahui mengandung konten ilegal.",
    className: "md:mt-12",
  },
  {
    icon: "♙",
    title: "Compliance & Reporting",
    description:
      "Protokol ekspor data yang terstandarisasi untuk memudahkan integrasi dengan lembaga pemerintah dan basis data penegak hukum.",
    className: "md:mt-0",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-[#482B19]">
      {/* Header */}
      <header className="relative z-10 flex min-h-[88px] flex-wrap items-center justify-between gap-4 rounded-b-[28px] bg-[#F5EFE5] px-6 py-4 md:px-7">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center text-3xl">
            🛡️
          </span>
          <span className="text-[23px] font-black tracking-wide md:text-[26px]">
            GAMBLEWATCH
          </span>
        </Link>

        <nav className="order-3 flex w-full items-center justify-center gap-5 rounded-full bg-white px-6 py-3 text-[11px] font-black tracking-wider md:order-2 md:w-auto md:gap-8">
          <Link href="/" className="hover:text-[#A66B43]">
            HOME
          </Link>
          <Link
            href="/gambling-analysis"
            className="whitespace-nowrap hover:text-[#A66B43]"
          >
            GAMBLING ANALYSIS
          </Link>
          <Link href="/feedback" className="hover:text-[#A66B43]">
            FEEDBACK
          </Link>
        </nav>

        <Link
          href="/my-analyses"
          className="order-2 rounded-full bg-[#482B19] px-6 py-3 text-[11px] font-black tracking-wider text-white shadow-md md:order-3"
        >
          MY ANALYSES
        </Link>
      </header>

      {/* Hero */}
      <section className="relative px-5 pb-12 pt-14 text-center md:px-10 md:pt-16">
        <div className="pointer-events-none absolute left-1/2 top-12 -z-0 h-48 w-[72%] -translate-x-1/2 rotate-[-3deg] rounded-[100px] bg-[#FAF7F2]" />

        <h1 className="relative mx-auto max-w-[1100px] text-[37px] font-normal leading-[1.22] tracking-tight md:text-[60px]">
          Systematic Intelligent Online
          <br />
          <span className="inline-block -rotate-1 rounded-xl bg-[#482B19] px-4 py-1 text-white">
            Gambling Detection
          </span>{" "}
          and Reporting
        </h1>

        <p className="relative mx-auto mt-7 max-w-[730px] text-base leading-7 text-[#786B60] md:text-[20px] md:leading-7">
          GAMBLEWATCH membantu pemangku kepentingan memantau, mengambil
          data, dan mengklasifikasikan domain perjudian online ilegal
          menggunakan teknologi deteksi multi-modal.
        </p>

        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-5">
          <Link
            href="/sign-up"
            className="flex min-w-[173px] items-center justify-center gap-3 rounded-full bg-[#482B19] px-7 py-4 text-xs font-black tracking-wide text-white shadow-lg transition hover:bg-[#63402A]"
          >
            <span className="text-lg">♙</span>
            SIGN UP
          </Link>

          <Link
            href="/sign-in"
            className="flex min-w-[173px] items-center justify-center gap-3 rounded-full bg-white px-7 py-4 text-xs font-black tracking-wide text-[#482B19] shadow-md transition hover:bg-[#F5EFE5]"
          >
            <span className="text-lg">⇥</span>
            SIGN IN
          </Link>
        </div>
      </section>

      {/* Main features */}
      <section className="px-6 pb-10 pt-5 md:px-16">
        <div className="mb-12 text-center">
          <span className="inline-block rounded-full bg-[#482B19] px-8 py-2 text-[27px] font-black tracking-wide text-white shadow-md">
            Fitur Utama
          </span>
        </div>

        <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-3 md:gap-4">
          {features.map((feature) => (
            <article
              key={feature.title}
              className={`relative min-h-[280px] rounded-[34px] border border-[#F4F0EB] bg-white px-8 py-7 shadow-[0_2px_3px_rgba(72,43,25,0.02)] ${feature.className}`}
            >
              <div className="mb-6 flex h-[66px] w-[66px] rotate-[-6deg] items-center justify-center rounded-[20px] bg-[#F5EFE5] text-2xl text-black">
                {feature.icon}
              </div>

              <h2 className="text-[19px] font-semibold tracking-tight">
                {feature.title}
              </h2>

              <p className="mt-4 text-sm leading-6 text-[#786B60]">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col items-center justify-between gap-5 rounded-t-[40px] bg-[#F5EFE5] px-6 py-7 text-center text-sm text-[#786B60] md:flex-row md:px-7 md:text-left">
        <p>© 2026 Kementerian Komunikasi dan Digital (KOMDIGI)</p>

        <div className="flex flex-wrap items-center justify-center gap-7 text-xs">
          <Link href="/about" className="hover:text-[#482B19]">
            About Web
          </Link>
          <Link href="/privacy-policy" className="hover:text-[#482B19]">
            Privacy Policy
          </Link>
          <Link
            href="/feedback"
            className="rounded-full bg-white px-5 py-3 hover:text-[#482B19]"
          >
            Contact Support
          </Link>
        </div>
      </footer>
    </main>
  );
}
