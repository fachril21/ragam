# Deploy (Vercel + Supabase)

Keputusan: hosting memakai **Vercel**, bukan cPanel/Nimbus Go seperti di rencana awal PRD. Dampaknya ada di
bagian "Deviasi" di `docs/phase-1.md`.

## Prasyarat

- Akun Vercel yang terhubung ke repo GitHub `fachril21/ragam`.
- Project Supabase (dev/staging) dan nilai URL, anon key, service role key.

## Langkah pertama kali

1. **Supabase**: instal Supabase CLI, lalu dari root repo:
   ```bash
   supabase link --project-ref <ref>
   supabase db push          # menjalankan semua file di supabase/migrations
   ```
   Jalankan `supabase/seed.sql` sekali lewat SQL Editor (atau `psql`) untuk data demo.
2. **Vercel**: Import project dari GitHub. Framework terdeteksi otomatis sebagai Next.js.
3. Isi environment variables (Settings → Environment Variables) sesuai `.env.example`.
   - Production = branch `main`, Preview = branch lain (`development`, `feat/*`).
   - Kunci pihak ketiga (Duitku, RajaOngkir) boleh dikosongkan sampai fasenya tiba.
4. Deploy. Setiap push ke `development` membuat preview URL; merge ke `main` membuat production.

## Variabel yang wajib

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `JOB_SECRET_TOKEN`, `REVALIDATE_SECRET_TOKEN`.
Aplikasi gagal start dengan daftar variabel yang salah bila ada yang hilang (`src/core/env.ts`).

## Rollback

Vercel → Deployments → pilih deployment sebelumnya → **Promote to Production** (kurang dari 1 menit).

## Cron (dipakai mulai Fase 5)

Vercel Cron (`vercel.json`) memanggil `/api/jobs/*` dengan header `Authorization: Bearer $JOB_SECRET_TOKEN`.
Plan Hobby membatasi cron harian; untuk interval 10 menit gunakan plan Pro atau penjadwal eksternal.

## Catatan batas

- Supabase Free dijeda setelah 7 hari tanpa aktivitas.
- Plan Hobby Vercel tidak untuk penggunaan komersial; gunakan Pro untuk klien nyata.
