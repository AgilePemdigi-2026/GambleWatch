import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="rounded-t-[40px] bg-cream px-6 py-12 drop-shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm leading-5 font-medium text-muted">
          © 2026 Kementerian Komunikasi dan Digital (KOMDIGI)
        </p>
        <nav
          aria-label="Tautan footer"
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs leading-4 font-medium text-muted"
        >
          <Link href="/about" className="transition-colors hover:text-brown">
            About Web
          </Link>
          <Link
            href="/kebijakan-privasi"
            className="transition-colors hover:text-brown"
          >
            Privacy Policy
          </Link>
          {/* Alamat dukungan belum ditentukan tim, jadi belum berupa tautan. */}
          <span className="rounded-full bg-white px-4 py-2">
            Contact Support
          </span>
        </nav>
      </div>
    </footer>
  );
}
