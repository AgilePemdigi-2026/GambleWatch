import type { Metadata } from "next";

import PageShell from "@/components/site/PageShell";

export const metadata: Metadata = {
  title: "Kebijakan Privasi | GambleWatch",
  description:
    "Cara GAMBLEWATCH mengumpulkan, menggunakan, menyimpan, dan melindungi informasi pengguna.",
};

const INTRO = [
  "GAMBLEWATCH merupakan platform yang dikembangkan untuk membantu masyarakat dalam melaporkan dan mengenali situs atau domain yang terindikasi terkait perjudian online ilegal. Layanan ini disediakan untuk mendukung proses pelaporan, analisis, dan pemantauan terhadap situs yang dilaporkan.",
  "Halaman ini menjelaskan bagaimana GAMBLEWATCH mengumpulkan, menggunakan, menyimpan, dan melindungi informasi yang diberikan oleh pengguna saat menggunakan layanan kami.",
  "Dengan menggunakan GAMBLEWATCH, Anda menyetujui pengumpulan dan penggunaan informasi sesuai dengan Kebijakan Privasi ini. Informasi yang dikumpulkan digunakan untuk menjalankan, menjaga, dan meningkatkan kualitas layanan, termasuk dalam proses analisis laporan dan penyampaian informasi kepada pihak yang berwenang apabila diperlukan.",
  "Kami tidak akan menggunakan atau membagikan informasi pribadi pengguna selain untuk tujuan yang dijelaskan dalam Kebijakan Privasi ini.",
];

const SECTIONS = [
  {
    title: "Pengumpulan dan penggunaan informasi",
    text: "GAMBLEWATCH dapat mengumpulkan informasi seperti email/NIK, URL yang dilaporkan, waktu pelaporan, dan hasil analisis. Informasi tersebut digunakan untuk memproses laporan dan mendukung pemantauan domain yang terindikasi berisiko.",
  },
  {
    title: "Keamanan Data",
    text: "Kami berupaya menjaga keamanan informasi pengguna dan data laporan. Namun, tidak ada sistem penyimpanan atau transmisi melalui internet yang dapat dijamin sepenuhnya aman.",
  },
  {
    title: "Perubahan kebijakan",
    text: "Kebijakan Privasi dapat diperbarui sewaktu-waktu. Perubahan akan ditampilkan pada halaman ini.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <PageShell>
      <div className="mx-auto w-full max-w-6xl px-6 pt-12 pb-16 sm:px-12">
        <h1 className="font-display text-2xl leading-6 text-brown">
          Kebijakan Privasi
        </h1>

        <div className="mt-8 flex flex-col gap-6 sm:pl-5">
          {INTRO.map((text) => (
            <p key={text} className="text-base leading-6 text-brown">
              {text}
            </p>
          ))}
        </div>

        {SECTIONS.map((section) => (
          <section key={section.title} className="mt-10">
            <h2 className="font-display text-base leading-6 text-brown">
              {section.title}
            </h2>
            <p className="mt-6 text-base leading-6 text-brown sm:pl-5">
              {section.text}
            </p>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
