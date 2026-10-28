-- Jalankan di Supabase Dashboard -> SQL Editor

-- 1. Laporan masyarakat (pengganti collection Firestore "laporan_masyarakat")
create table if not exists public.laporan_masyarakat (
  id                 uuid primary key default gen_random_uuid(),
  situs_url          text not null,
  dilaporkan_oleh    text default 'Anonim',
  klasifikasi        text default 'PENDING' check (klasifikasi in ('HIGH','MEDIUM','LOW','PENDING')),
  tanggal_deteksi    text,               -- format DD/MM/YYYY, mengikuti UI yang ada
  pola_url_match     text,
  visual_similarity  text,
  kata_kunci_ocr     text,
  screenshot_url     text,
  catatan_admin      text,
  status_verifikasi  text check (status_verifikasi in ('TERVERIFIKASI','DITOLAK')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz
);

-- 2. Keyword judi untuk DET-04 (pengganti collection Firestore "keywords")
create table if not exists public.keywords (
  id          bigint generated always as identity primary key,
  term        text not null,
  category    text not null default 'general',
  weight      real not null default 0.5 check (weight between 0 and 1),
  active      boolean not null default true,
  language    text not null default 'id',
  variations  text[] default '{}',
  aliases     text[] default '{}',
  unique (term, language)
);

-- 3. Row Level Security
alter table public.laporan_masyarakat enable row level security;
alter table public.keywords enable row level security;

-- Policy sementara untuk development: semua orang boleh baca & update.
-- GANTI dengan policy berbasis auth/role admin sebelum production.
create policy "dev read laporan"   on public.laporan_masyarakat for select using (true);
create policy "dev insert laporan" on public.laporan_masyarakat for insert with check (true);
create policy "dev update laporan" on public.laporan_masyarakat for update using (true);
create policy "read active keywords" on public.keywords for select using (active = true);

-- 4. Aktifkan Realtime untuk halaman admin hasil klasifikasi
alter publication supabase_realtime add table public.laporan_masyarakat;
