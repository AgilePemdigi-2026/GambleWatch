-- Salinan dari supabase-setup/migration_05_laporan_simpan_server.sql
-- Migration 05: laporan dan hasil deteksi hanya ditulis oleh SERVER
--
-- Sebelumnya (migration_02) semua orang boleh melakukan apa saja pada laporan_analisis, sehingga
-- browser bisa menyimpan laporan dengan tingkat risiko atau bukti palsu. Sekarang:
--   * MENAMBAH laporan hanya oleh server (route /api/analyze dengan kunci service_role).
--   * Kolom hasil deteksi tidak bisa diubah dari browser, kecuali oleh admin (mis. unggah bukti
--     manual di halaman Tindak Lanjut). Status tetap bisa diubah (simpan/kirim ke admin).
--   * Bukti gambar di bucket bukti-analisis tetap bisa dibaca publik, tetapi hanya server dan admin
--     yang boleh mengunggah.
--
-- SEBELUM menjalankan: isi SUPABASE_SERVICE_ROLE_KEY di environment server Next.js (BUKAN
-- NEXT_PUBLIC_..., jangan di-commit). Tanpa itu form analisis tidak bisa menyimpan laporan.

-- 1. Policy laporan_analisis -----------------------------------------------------------

alter table public.laporan_analisis enable row level security;

drop policy if exists "Enable all access for laporan_analisis" on public.laporan_analisis;

drop policy if exists "baca laporan" on public.laporan_analisis;
create policy "baca laporan" on public.laporan_analisis
  for select using (true);

drop policy if exists "ubah laporan" on public.laporan_analisis;
create policy "ubah laporan" on public.laporan_analisis
  for update using (true) with check (true);   -- kolom hasil deteksi dijaga trigger di bawah

drop policy if exists "hapus laporan" on public.laporan_analisis;
create policy "hapus laporan" on public.laporan_analisis
  for delete using (true);                     -- tombol "Discard Analysis" (perilaku lama)

-- Tidak ada policy INSERT untuk anon/authenticated: hanya service_role (melewati RLS) yang bisa
-- menambah laporan.

-- 2. Kolom hasil deteksi hanya boleh diubah server/admin -------------------------------

create or replace function public.lindungi_hasil_deteksi()
returns trigger
language plpgsql
as $$
begin
  -- Akses langsung ke database (SQL Editor, migrasi) tidak membawa klaim JWT
  if current_setting('request.jwt.claims', true) is null
     or coalesce(auth.role(), '') = 'service_role'
     or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin' then
    return new;
  end if;

  if new.url_situs is distinct from old.url_situs
     or new.tingkat_risiko is distinct from old.tingkat_risiko
     or new.skor_probabilitas is distinct from old.skor_probabilitas
     or new.url_pattern_analysis is distinct from old.url_pattern_analysis
     or new.visual_similarity is distinct from old.visual_similarity
     or new.ocr_flagged is distinct from old.ocr_flagged
     or new.keywords_found is distinct from old.keywords_found
     or new.bukti_deteksi is distinct from old.bukti_deteksi
     or new.bukti_screenshot is distinct from old.bukti_screenshot
     or new.user_id is distinct from old.user_id then
    raise exception 'Hasil deteksi hanya dapat diubah oleh server atau admin'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists lindungi_hasil_deteksi on public.laporan_analisis;
create trigger lindungi_hasil_deteksi
  before update on public.laporan_analisis
  for each row execute function public.lindungi_hasil_deteksi();

-- 3. Bucket bukti-analisis --------------------------------------------------------------

drop policy if exists "Allow all operations on bukti-analisis" on storage.objects;

drop policy if exists "baca bukti analisis" on storage.objects;
create policy "baca bukti analisis" on storage.objects
  for select using (bucket_id = 'bukti-analisis');

drop policy if exists "admin unggah bukti analisis" on storage.objects;
create policy "admin unggah bukti analisis" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'bukti-analisis'
              and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
