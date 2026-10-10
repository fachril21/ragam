# Ragam — template toko online fashion UMKM

Template Next.js + Supabase untuk toko fashion UMKM. Rencana kerja ada di
[`docs/Development Phases — Template Toko Online Fashion UMKM.md`](<docs/Development Phases — Template Toko Online Fashion UMKM.md>).

## Mulai

```bash
npm install
cp .env.example .env.local   # isi minimal variabel Supabase
npm run dev
```

Database: jalankan `supabase/migrations/*.sql` berurutan lalu `supabase/seed.sql`
(lihat [`docs/deploy.md`](docs/deploy.md)).

## Perintah

| Perintah                | Fungsi                                                               |
| ----------------------- | -------------------------------------------------------------------- |
| `npm run dev`           | Server pengembangan                                                  |
| `npm run lint`          | ESLint                                                               |
| `npm run typecheck`     | TypeScript                                                           |
| `npm test`              | Unit, komponen, dan uji database (PGlite)                            |
| `npm run test:coverage` | Uji + coverage (ambang 80%)                                          |
| `npm run build`         | Build produksi                                                       |
| `npm run qa:rls`        | Cek RLS dengan anon key terhadap project Supabase (butuh .env.local) |

## Struktur

- `src/core` — logika inti, jangan diubah per klien (tidak boleh import dari `src/custom`)
- `src/theme` — token desain dan `store.config.ts` (diubah per klien)
- `src/custom` — override khusus klien
- `supabase/migrations` — satu-satunya jalur perubahan skema
- `scripts/qa` — skrip bukti acceptance criteria
- `tests/db` — migrasi, constraint, dan RLS diuji di Postgres sungguhan (PGlite)

Halaman `/design` menampilkan semua komponen dan token (hanya di mode dev).
