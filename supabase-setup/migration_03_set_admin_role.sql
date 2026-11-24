-- Migration 03: Set role admin di metadata auth.users
-- Ganti email di bawah sesuai akun admin yang digunakan pada masing-masing environment Supabase

UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb,
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'mapleschoco@gmail.com';