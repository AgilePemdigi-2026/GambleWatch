import Image from "next/image";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "home" },
  { href: "/gambling-analysis", label: "gambling analysis" },
  { href: "/feedback", label: "feedback" },
];

export default function SiteHeader() {
  return (
    <header className="relative z-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-b-3xl bg-cream/80 px-6 py-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)] backdrop-blur-[6px]">
      <Link href="/" className="flex items-center gap-1">
        <Image
          src="/about/logo.png"
          alt=""
          width={62}
          height={62}
          priority
          className="size-[62px] object-cover"
        />
        <span className="font-display text-2xl leading-8 tracking-[-0.24px] text-brown">
          GAMBLEWATCH
        </span>
      </Link>

      <nav
        aria-label="Navigasi utama"
        className="order-last flex w-full items-center justify-center gap-4 rounded-full bg-white px-4 py-3 drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)] sm:gap-8 sm:px-8 lg:order-none lg:w-auto"
      >
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="font-display text-xs leading-4 tracking-[0.6px] whitespace-nowrap text-muted transition-colors hover:text-brown"
          >
            {label}
          </Link>
        ))}
      </nav>

      <Link
        href="/my-analyses"
        className="rounded-full bg-brown px-6 py-3 font-display text-xs leading-4 tracking-[0.6px] whitespace-nowrap text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] transition-opacity hover:opacity-90"
      >
        my analyses
      </Link>
    </header>
  );
}
