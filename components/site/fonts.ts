import { Holtwood_One_SC, Inter, Plus_Jakarta_Sans } from "next/font/google";

// Font halaman admin hi-fi (Figma "Keyword Database - Hi-Fi")
export const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta",
});

export const holtwood = Holtwood_One_SC({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-holtwood",
});

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});
