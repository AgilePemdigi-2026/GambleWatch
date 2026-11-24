'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface PublicHeaderProps {
  activeTab?: 'home' | 'analysis' | 'feedback';
}

export default function PublicHeader({ activeTab = 'analysis' }: PublicHeaderProps) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Cek sesi pengguna saat ini dari Supabase
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(Boolean(user));
    });

    // Dengarkan perubahan status login/logout secara otomatis
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      const supabase = createClient();
      await supabase.auth.signOut();

      setIsLoggedIn(false);
      router.replace('/sign-in/sign-in-masyarakat');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="px-6 pt-4">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center px-8 py-3 bg-[#F7F2EB] rounded-full shadow-sm gap-4">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="GambleWatch Logo" width={32} height={32} className="object-contain" />
          <span className="font-black text-xl tracking-wider text-[#3B1E12]">
            GAMBLEWATCH
          </span>
        </Link>

        <nav className="flex items-center gap-6 bg-white/80 px-6 py-2 rounded-full text-xs font-bold text-[#3B1E12] border border-stone-200">
          <Link 
            href="/" 
            className={`transition-all uppercase tracking-wider ${activeTab === 'home' ? 'font-black border-b-2 border-[#3B1E12] pb-0.5' : 'opacity-70 hover:opacity-100'}`}
          >
            HOME
          </Link>
          <Link 
            href="/form-gamblin-analysis" 
            className={`transition-all uppercase tracking-wider ${activeTab === 'analysis' ? 'font-black border-b-2 border-[#3B1E12] pb-0.5' : 'opacity-70 hover:opacity-100'}`}
          >
            GAMBLING ANALYSIS
          </Link>
          <Link 
            href="/feedback" 
            className={`transition-all uppercase tracking-wider ${activeTab === 'feedback' ? 'font-black border-b-2 border-[#3B1E12] pb-0.5' : 'opacity-70 hover:opacity-100'}`}
          >
            FEEDBACK
          </Link>
        </nav>

        <div className="flex items-center gap-2.5">
          <Link
            href="/my-analyses"
            className="bg-[#3B1E12] text-white px-5 py-2 rounded-full font-bold text-xs hover:bg-[#28130a] transition-all uppercase tracking-wider"
          >
            MY ANALYSES
          </Link>

          {isLoggedIn && (
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              title="Logout"
              className="flex items-center gap-1.5 border border-[#3B1E12] text-[#3B1E12] bg-white/80 hover:bg-red-50 hover:text-red-700 hover:border-red-700 px-4 py-2 rounded-full font-bold text-xs transition-all uppercase tracking-wider cursor-pointer disabled:opacity-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{isLoggingOut ? '...' : 'LOGOUT'}</span>
            </button>
          )}
        </div>
      </header>
    </div>
  );
}