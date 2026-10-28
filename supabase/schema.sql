-- Jalankan di Supabase Dashboard -> SQL Editor

-- Tabel laporan (`laporan_analisis`, dipakai halaman admin) dikelola langsung
-- oleh tim di Supabase dan tidak didefinisikan di sini. Pastikan Row Level
-- Security-nya aktif dan hanya admin yang boleh mengubah/membaca semua baris.

-- Keyword judi untuk DET-04 (dibaca oleh KeywordProvider di detection_engine)
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

-- Row Level Security: keyword aktif boleh dibaca; tidak ada policy tulis,
-- jadi hanya service_role (server) yang bisa menambah atau mengubah.
alter table public.keywords enable row level security;

drop policy if exists "read active keywords" on public.keywords;
create policy "read active keywords" on public.keywords
  for select using (active = true);
