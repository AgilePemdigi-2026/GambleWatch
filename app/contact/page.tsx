import React from "react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import {
  Building2,
  Mail,
  MapPin,
  MessageSquare,
  ShieldAlert,
  Phone,
} from "lucide-react";

export default function ContactSupportPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-[#3B1E12]">
      {/* Header Publik */}
      <PublicHeader />

      {/* Konten Utama */}
      <main className="flex-grow max-w-5xl w-full mx-auto px-6 md:px-12 py-12 md:py-16">
        {/* Judul & Subjudul */}
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-black tracking-wide text-[#3B1E12] mb-2">
            PERLU INFORMASI LEBIH?
          </h1>
          <p className="text-sm md:text-base font-extrabold tracking-wide text-[#4A2E1B] pl-1 md:pl-3">
            SILAKAN HUBUNGI TIM PENGELOLA KAMI MELALUI KANAL BERIKUT
          </p>
        </div>

        {/* Grid Informasi Kontak */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-1 md:pl-3">
          {/* Card 1: Instansi, Alamat & Email */}
          <div className="bg-[#F7F2EB] border border-stone-200/80 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-white border border-stone-200/80 text-[#3B1E12] shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  Instansi Terkait
                </span>
                <p className="text-base font-bold text-[#3B1E12]">
                  Kementerian Komunikasi dan Digital Republik Indonesia (KOMDIGI)
                </p>
                <p className="text-xs text-[#523624] mt-0.5">
                  Direktorat Pengendalian Aplikasi Informatika
                </p>
              </div>
            </div>

            <div className="border-t border-stone-200/80 pt-4 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-white border border-stone-200/80 text-[#3B1E12] shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  Email Pengelola & Dukungan Teknis
                </span>
                <p className="text-sm font-bold text-[#3B1E12]">
                  support@gamblewatch.komdigi.go.id
                </p>
                <p className="text-xs text-[#523624] mt-0.5">
                  Pertanyaan terkait analisis domain, pelaporan, dan kerja sama
                </p>
              </div>
            </div>

            <div className="border-t border-stone-200/80 pt-4 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-white border border-stone-200/80 text-[#3B1E12] shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  Alamat Kantor Pusat
                </span>
                <p className="text-sm font-semibold text-[#3B1E12]">
                  Jl. Medan Merdeka Barat No. 9, Gambir, Jakarta Pusat 10110
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Hotline & Kanal Laporan */}
          <div className="bg-[#F7F2EB] border border-stone-200/80 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-white border border-stone-200/80 text-[#3B1E12] shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  Layanan Pengaduan Konten (WhatsApp)
                </span>
                <p className="text-lg font-black text-[#3B1E12]">
                  0811-9224-545
                </p>
                <p className="text-xs text-[#523624] mt-0.5">
                  Saluran koordinasi laporan situs dan konten berisiko
                </p>
              </div>
            </div>

            <div className="border-t border-stone-200/80 pt-4 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-white border border-stone-200/80 text-[#3B1E12] shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  Kanal Khusus Laporan Terkait Judi Online
                </span>
                <p className="text-lg font-black text-[#3B1E12]">
                  0811-1001-5080
                </p>
                <p className="text-xs text-[#523624] mt-0.5">
                  Hotline khusus pelaporan cepat domain perjudian online ilegal
                </p>
              </div>
            </div>

            <div className="border-t border-stone-200/80 pt-4 flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-white border border-stone-200/80 text-[#3B1E12] shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  Contact Center & Jam Layanan
                </span>
                <p className="text-sm font-bold text-[#3B1E12]">
                  Contact Center KOMDIGI: 159
                </p>
                <p className="text-xs text-[#523624] mt-0.5">
                  Senin – Jumat, 08.00 – 16.00 WIB (Sistem GambleWatch beroperasi 24 jam)
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Publik */}
      <PublicFooter />
    </div>
  );
}