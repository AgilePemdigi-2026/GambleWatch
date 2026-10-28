import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi di .env.local"
  );
}

// Satu client dipakai bersama untuk database, auth, dan storage.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Nama tabel dipusatkan di sini supaya tidak typo di banyak file.
export const TABLES = {
  laporan: "laporan_masyarakat",
  keywords: "keywords",
} as const;
