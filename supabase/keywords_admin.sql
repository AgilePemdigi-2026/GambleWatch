-- Halaman admin Keyword Database (/admin/keywords): kolom tanggal + izin tulis khusus admin.
-- Jalankan sekali di Supabase Dashboard -> SQL Editor (aman dijalankan ulang).

-- 1. Tanggal ditambahkan dan terakhir diperbarui
alter table public.keywords
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.keywords_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists keywords_set_updated_at on public.keywords;
create trigger keywords_set_updated_at
  before update on public.keywords
  for each row execute function public.keywords_set_updated_at();

-- 2. Admin boleh membaca semua kata (termasuk nonaktif) dan menambah/mengubah/menghapus.
--    Peran diambil dari app_metadata token login (hanya bisa diubah dari sisi server
--    Supabase, bukan oleh pengguna), sama dengan pengecekan di halaman sign-in admin.
--    Policy baca kata aktif untuk publik ("read active keywords") tetap berlaku;
--    mesin deteksi tetap hanya membaca kata aktif.
drop policy if exists "admin manage keywords" on public.keywords;
create policy "admin manage keywords" on public.keywords
  for all
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
