import type { Metadata } from "next";

import PageShell from "@/components/site/PageShell";

export const metadata: Metadata = {
  title: "Tentang GambleWatch",
  description:
    "GAMBLEWATCH adalah platform yang membantu masyarakat dan pihak terkait mengenali serta melaporkan situs perjudian online yang tidak berizin.",
};

const SECTIONS = [
  {
    title: "Misi Kami",
    paragraphs: [
      "GAMBLEWATCH dibuat untuk membantu menciptakan ruang digital yang lebih aman. Sistem ini memeriksa situs yang dilaporkan dengan melihat berbagai informasi dan pola yang berkaitan dengan aktivitas perjudian online.",
      "Informasi dari hasil pemeriksaan dapat membantu masyarakat dan pihak terkait dalam mengenali situs yang mencurigakan dan mengambil tindakan yang sesuai.",
    ],
  },
  {
    title: "Cara Kerja Kami",
    paragraphs: [
      "GAMBLEWATCH menggabungkan laporan dari masyarakat dengan pemeriksaan otomatis.",
      "Ketika sebuah situs dilaporkan, sistem akan memeriksa isi, struktur, dan karakteristik situs tersebut. Hasil pemeriksaan kemudian digunakan untuk menentukan apakah situs tersebut memiliki indikasi perjudian online ilegal.",
      "Dengan cara ini, GAMBLEWATCH dapat mengumpulkan informasi mengenai situs-situs yang dilaporkan dalam satu sistem.",
    ],
  },
  {
    title: "Transparansi Publik",
    paragraphs: [
      "Kami ingin masyarakat lebih mudah mendapatkan informasi mengenai situs perjudian online yang mencurigakan.",
      "Pengguna dapat melihat informasi dan tren yang tersedia, melaporkan situs yang dianggap mencurigakan, serta mendapatkan informasi mengenai cara menjaga keamanan saat menggunakan internet.",
    ],
  },
];

export default function AboutPage() {
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-5xl px-6 pt-12 pb-20">
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="font-display text-2xl leading-6 text-brown">
            Apa itu gamblewatch?
          </h1>
          <p className="mt-6 text-base leading-6 text-muted">
            GAMBLEWATCH adalah platform yang membantu masyarakat dan pihak
            terkait mengenali serta melaporkan situs perjudian online yang
            tidak berizin.
          </p>
        </section>

        <div className="mt-16 flex flex-col gap-16 md:gap-12">
          {SECTIONS.map((section, index) => (
            <section
              key={section.title}
              className={`flex flex-col items-center gap-10 md:gap-16 ${
                index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
              }`}
            >
              {/* Tempat ilustrasi; desain Figma masih berupa lingkaran kosong */}
              <div
                aria-hidden
                className="h-[206px] w-[219px] shrink-0 rounded-full border-2 border-dashed border-outline bg-cream shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
              />
              <div className="flex max-w-xl flex-col gap-4">
                <h2 className="font-body text-2xl leading-8 font-semibold tracking-[-0.24px] text-brown">
                  {section.title}
                </h2>
                {section.paragraphs.map((text) => (
                  <p key={text} className="text-sm leading-5 text-muted">
                    {text}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
