import React from "react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-[#3B1E12]">
      {/* Header Publik */}
      <PublicHeader />

      {/* Konten Utama */}
      <main className="flex-grow max-w-5xl w-full mx-auto px-6 md:px-12 py-12 md:py-16">
        {/* Judul Utama */}
        <h1 className="text-3xl md:text-4xl font-black tracking-wide text-[#3B1E12] mb-8">
          KEBIJAKAN PRIVASI
        </h1>

        {/* Paragraf Pembuka */}
        <div className="space-y-5 text-sm md:text-base leading-relaxed text-[#523624] pl-2 md:pl-4">
          <p>
            GAMBLEWATCH merupakan platform yang dikembangkan untuk membantu
            masyarakat dalam melaporkan dan mengenali situs atau domain yang
            terindikasi terkait perjudian online ilegal. Layanan ini disediakan
            untuk mendukung proses pelaporan, analisis, dan pemantauan terhadap
            situs yang dilaporkan.
          </p>

          <p>
            Halaman ini menjelaskan bagaimana GAMBLEWATCH mengumpulkan,
            menggunakan, menyimpan, dan melindungi informasi yang diberikan
            oleh pengguna saat menggunakan layanan kami.
          </p>

          <p>
            Dengan menggunakan GAMBLEWATCH, Anda menyetujui pengumpulan dan
            penggunaan informasi sesuai dengan Kebijakan Privasi ini. Informasi
            yang dikumpulkan digunakan untuk menjalankan, menjaga, dan
            meningkatkan kualitas layanan, termasuk dalam proses analisis
            laporan dan penyampaian informasi kepada pihak yang berwenang
            apabila diperlukan.
          </p>

          <p>
            Kami tidak akan menggunakan atau membagikan informasi pribadi
            pengguna selain untuk tujuan yang dijelaskan dalam Kebijakan Privasi
            ini.
          </p>

          {/* Sub-bagian 1 */}
          <section className="pt-4">
            <h2 className="text-base md:text-lg font-black tracking-wide text-[#3B1E12] mb-2.5">
              PENGUMPULAN DAN PENGGUNAAN INFORMASI
            </h2>
            <p>
              GAMBLEWATCH dapat mengumpulkan informasi seperti email/NIK, URL
              yang dilaporkan, waktu pelaporan, dan hasil analisis. Informasi
              tersebut digunakan untuk memproses laporan dan mendukung
              pemantauan domain yang terindikasi berisiko.
            </p>
          </section>

          {/* Sub-bagian 2 */}
          <section className="pt-4">
            <h2 className="text-base md:text-lg font-black tracking-wide text-[#3B1E12] mb-2.5">
              KEAMANAN DATA
            </h2>
            <p>
              Kami berupaya menjaga keamanan informasi pengguna dan data laporan.
              Namun, tidak ada sistem penyimpanan atau transmisi melalui
              internet yang dapat dijamin sepenuhnya aman.
            </p>
          </section>

          {/* Sub-bagian 3 */}
          <section className="pt-4">
            <h2 className="text-base md:text-lg font-black tracking-wide text-[#3B1E12] mb-2.5">
              PERUBAHAN KEBIJAKAN
            </h2>
            <p>
              Kebijakan Privasi dapat diperbarui sewaktu-waktu. Perubahan akan
              ditampilkan pada halaman ini.
            </p>
          </section>
        </div>
      </main>

      {/* Footer Publik */}
      <PublicFooter />
    </div>
  );
}