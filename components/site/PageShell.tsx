import type { ReactNode } from "react";

import { holtwood, inter } from "./fonts";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

/** Kerangka halaman publik: font, header, area isi, dan footer. */
export default function PageShell({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${holtwood.variable} ${inter.variable} relative flex min-h-screen flex-1 flex-col overflow-hidden bg-white font-body text-brown`}
    >
      {/* Gumpalan latar krem di pojok kiri atas, hanya hiasan */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -left-10 size-[500px] rounded-full bg-cream opacity-50 mix-blend-multiply blur-[32px]"
      />
      <SiteHeader />
      <main className="relative flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
