// Klien Supabase untuk kode yang berjalan di SERVER (Route Handler), jangan diimpor dari komponen
// 'use client'. SUPABASE_SERVICE_ROLE_KEY hanya dibaca di sini dan tidak pernah dikirim ke browser
// (tanpa awalan NEXT_PUBLIC_).

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/** Klien dengan sesi pengguna dari cookie: untuk mengetahui siapa yang melapor. */
export async function createSessionClient() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Penyegaran token tidak wajib untuk sekadar membaca pengguna
        }
      },
    },
  });
}

/**
 * Klien penulis laporan. Memakai kunci service_role bila SUPABASE_SERVICE_ROLE_KEY diisi;
 * kunci ini WAJIB setelah supabase/laporan_simpan_server.sql dijalankan, karena sejak itu
 * browser (anon) tidak lagi boleh menambah laporan.
 */
export function createWriterClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const client = createClient(SUPABASE_URL, serviceKey || ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { client, privileged: Boolean(serviceKey) };
}
