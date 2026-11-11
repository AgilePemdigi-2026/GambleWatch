'use client';

import React from 'react';
import Link from 'next/link';

export default function PublicFooter() {
  return (
    <footer className="mt-8 bg-[#F7F2EB] rounded-t-3xl px-8 py-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-stone-600 font-medium">
        <p>© 2026 Kementerian Komunikasi dan Digital (KOMDIGI)</p>
        <div className="flex items-center gap-6">
          <Link href="/about" className="hover:text-stone-900 transition-colors">
            About Web
          </Link>
          <Link href="/privacy" className="hover:text-stone-900 transition-colors">
            Privacy Policy
          </Link>
          <Link
            href="/contact"
            className="bg-white border border-stone-300 text-stone-800 px-5 py-2 rounded-full font-semibold shadow-2xs hover:bg-stone-50 transition-all"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </footer>
  );
}