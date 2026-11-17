# Panduan Setup Supabase Lokal

1. **Jalankan Docker Supabase:** Aktifkan Docker Desktop, lalu jalankan `docker compose up -d` di folder Docker Supabase hingga `http://localhost:8000` aktif.
2. **Setup Database & Storage:** Buka **SQL Editor** di `http://localhost:8000`, tempel seluruh isi `supabase-setup/schema.sql`, lalu klik **Run**.
3. **Atur Environment Variables:** Buat file `.env.local` di root proyek Next.js dan salin isi dari `supabase-setup/.env.example`.
4. **Jalankan Aplikasi:** Jalankan `npm install` lalu `npm run dev`.