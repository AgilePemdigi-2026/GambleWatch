'use client';

import React from 'react';
import Link from 'next/link';

export default function AdminFooter() {
  return (
    <footer className="mt-8 bg-white border-t border-stone-100 px-8 py-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-stone-600 font-medium">
        <p>© 2026 Kementerian Komunikasi dan Digital (KOMDIGI). Seluruh hak cipta dilindungi.</p>
        <div className="flex items-center gap-6">
          <Link href="/about" className="hover:text-stone-900 transition-colors">
            Tentang web
          </Link>
          <Link href="/privacy" className="hover:text-stone-900 transition-colors">
            Kebijakan privasi
          </Link>
          <Link
            href="/contact"
            className="bg-[#EFECE6] text-[#3B1E12] px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-stone-200 transition-all shadow-2xs"
          >
            Hubungi dukungan
          </Link>
        </div>
      </div>
    </footer>
  );
}