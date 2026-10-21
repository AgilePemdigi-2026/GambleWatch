import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Holtwood_One_SC } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Font tambahan untuk halaman GambleWatch kamu
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const holtwood = Holtwood_One_SC({
  weight: "400",
  variable: "--font-holtwood",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GambleWatch",
  description: "Platform Analisis Indikasi Situs Judi Online",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${holtwood.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}