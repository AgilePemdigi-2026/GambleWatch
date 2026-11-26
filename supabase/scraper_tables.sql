-- Tabel antrean dan hasil web scraping (Sprint 3).
-- Rancangan: docs/RANCANGAN_SCRAPER.md §6 (antrean) dan §8 (skema).
-- Jalankan sekali di SQL Editor Supabase, setelah tabel laporan_analisis ada.
-- Aman dijalankan ulang (if not exists / create or replace).
--
-- Siapa boleh apa:
--   * Worker scraper menulis dengan kunci service_role (melewati RLS), hanya di server.
--   * Admin (app_metadata.role = 'admin') boleh MEMBACA kedua tabel untuk halaman Monitoring
--     dan MENAMBAH job baru berstatus PENDING (tombol "Jalankan Scan Baru").
--   * anon dan pengguna biasa tidak bisa membaca atau menulis apa pun.

-- 1. Antrean job --------------------------------------------------------------

create table if not exists public.scrape_jobs (
  id               bigint generated always as identity primary key,
  url              text not null,
  source           text not null default 'manual'
                     check (source in ('report', 'rescan', 'discovery', 'manual')),
  laporan_id       bigint references public.laporan_analisis(id) on delete set null,
  priority         smallint not null default 5 check (priority between 1 and 9),
                   -- 1 = dari form pengguna, 3 = scan ulang, 5 = discovery/manual
  status           text not null default 'PENDING'
                     check (status in ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'BLOCKED')),
  failure_code     text,      -- TIMEOUT, DNS, CONNECTION, TLS, HTTP_4XX, HTTP_5XX,
                              -- BOT_PROTECTION, UNSAFE_TARGET, DOWNLOAD, STALE, ERROR
  failure_message  text,
  attempts         smallint not null default 0,
  next_attempt_at  timestamptz not null default now(),
  worker_id        text,
  created_at       timestamptz not null default now(),
  started_at       timestamptz,
  finished_at      timestamptz
);

create index if not exists scrape_jobs_queue_idx
  on public.scrape_jobs (status, priority, next_attempt_at, created_at);
create index if not exists scrape_jobs_laporan_idx on public.scrape_jobs (laporan_id);

-- 2. Hasil scraping + deteksi -------------------------------------------------

create table if not exists public.scrape_results (
  id                bigint generated always as identity primary key,
  job_id            bigint not null references public.scrape_jobs(id) on delete cascade,
  final_url         text,
  http_status       smallint,
  redirect_chain    text[],
  title             text,
  meta_description  text,
  page_text         text,          -- dipotong maks. 200.000 karakter
  screenshot_path   text,          -- path di disk server worker
  outbound_links    text[],        -- bahan "bola salju" (link alternatif)
  load_ms           integer,
  user_agent        text,
  overall_score     real,          -- 0..1 dari pipeline DET-05
  indication        text check (indication in ('Rendah', 'Sedang', 'Tinggi')),
  modules           jsonb,         -- get_summary()['modules']: skor, temuan, potongan teks per modul
  profile           text,          -- tampilan yang dinilai: desktop / search / mobile
  cloaking          boolean not null default false,  -- spam hanya tampil ke pengunjung dari Google
  scraped_at        timestamptz not null default now()
);

-- Untuk tabel yang sudah dibuat dengan versi sebelumnya
alter table public.scrape_results add column if not exists profile text;
alter table public.scrape_results add column if not exists cloaking boolean not null default false;

create index if not exists scrape_results_job_idx on public.scrape_results (job_id);

-- 3. Mengambil job berikutnya (dipanggil worker lewat RPC) ---------------------
-- FOR UPDATE SKIP LOCKED: dua worker tidak pernah mengambil job yang sama.
-- Job IN_PROGRESS yang macet lebih dari p_stale_minutes dikembalikan ke PENDING,
-- atau ditandai FAILED (STALE) bila sudah dicoba p_max_attempts kali.

create or replace function public.claim_scrape_job(
  p_worker text,
  p_stale_minutes integer default 10,
  p_max_attempts integer default 3
)
returns setof public.scrape_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  update scrape_jobs
     set status = case when attempts >= p_max_attempts then 'FAILED' else 'PENDING' end,
         failure_code = case when attempts >= p_max_attempts then 'STALE' else failure_code end,
         finished_at = case when attempts >= p_max_attempts then now() else null end,
         worker_id = null,
         started_at = null
   where status = 'IN_PROGRESS'
     and started_at < now() - make_interval(mins => p_stale_minutes);

  return query
  update scrape_jobs j
     set status = 'IN_PROGRESS',
         started_at = now(),
         worker_id = p_worker,
         attempts = j.attempts + 1
   where j.id = (
           select id from scrape_jobs
            where status = 'PENDING' and next_attempt_at <= now()
            order by priority, created_at
            for update skip locked
            limit 1)
  returning j.*;
end;
$$;

revoke all on function public.claim_scrape_job(text, integer, integer) from public, anon, authenticated;
grant execute on function public.claim_scrape_job(text, integer, integer) to service_role;

-- 4. Row Level Security -------------------------------------------------------

alter table public.scrape_jobs    enable row level security;
alter table public.scrape_results enable row level security;

drop policy if exists "admin read scrape_jobs" on public.scrape_jobs;
create policy "admin read scrape_jobs" on public.scrape_jobs
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Tombol "Jalankan Scan Baru" di halaman Monitoring: admin hanya boleh MENAMBAH job baru
-- yang masih PENDING. Mengubah status/hasil tetap hanya oleh worker (service_role).
drop policy if exists "admin queue scrape_jobs" on public.scrape_jobs;
create policy "admin queue scrape_jobs" on public.scrape_jobs
  for insert to authenticated
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and status = 'PENDING' and attempts = 0 and worker_id is null
    and source in ('manual', 'rescan')
  );

drop policy if exists "admin read scrape_results" on public.scrape_results;
create policy "admin read scrape_results" on public.scrape_results
  for select to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Contoh menambah job secara manual (untuk uji coba):
--   insert into public.scrape_jobs (url, source, priority) values ('https://contoh.com', 'manual', 5);
