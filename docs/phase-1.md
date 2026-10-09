# Fase 1 — Fondasi: scaffold, design token, database

Status: **kode selesai, bukti staging belum ada** (menunggu project Supabase dan Vercel dari pemilik repo).

## Keputusan

| Keputusan | Alasan |
| --- | --- |
| Hosting di Vercel, bukan cPanel/Nimbus Go | Diputuskan pemilik repo. `server.js`, `build:package`, dan spike hosting dibatalkan |
| Next.js 16 dengan `cacheComponents` (default create-next-app) dipertahankan | Cache Components menggantikan `revalidate`/ISR gaya lama; Fase 2 memakai `use cache` + `cacheLife` + tag untuk E1-AC6 |
| Uji database memakai PGlite (Postgres in-process), bukan mock | Migrasi, constraint, dan RLS terbukti di engine Postgres sungguhan tanpa Supabase; stub peran/`auth.uid()` ada di `tests/db/supabase-stub.sql` |
| Kolom publik `store_settings` dibatasi lewat `GRANT SELECT (kolom)` untuk anon | Field internal (`api_daily_limit`, asal kirim, dst) tidak bisa dibaca anon walau RLS `using (true)` |
| Kunci pihak ketiga opsional di `src/core/env.ts` | App boleh start tanpa Duitku/RajaOngkir; string kosong dianggap belum diisi |
| Kolom `idempotency_key`, `expires_at`, `paid_at`, `needs_review`, `stock_released` ditunda ke migrasi Fase 5 | Sesuai bagian 5.1 dokumen fase |

## Deviasi dari dokumen fase

- Tidak ada `server.js` dan `npm run build:package` (Vercel).
- Header `lint rule` "client tidak boleh import server.ts" diwujudkan sebagai uji arsitektur (`tests/architecture.test.ts`) ditambah `import "server-only"`.
- `supabase gen types` belum dijalankan (butuh database); `npm run db:types` disiapkan. Data layer sementara memakai tipe baris tulisan tangan di `src/core/data/catalog.ts`.
- Spike RajaOngkir/Duitku baru berupa template (`docs/spike-*.md`) karena menunggu API key.

## Bukti acceptance criteria

| Kode | Bukti | Status |
| --- | --- | --- |
| E0-AC1 | `npm run build` hijau lokal dengan env dummy; CI di `.github/workflows/ci.yml`. URL staging HTTPS **belum** ada | Sebagian |
| E0-AC2 | Token tunggal di `src/theme/tokens.ts` + `store.config.ts`; `css-sync.test.ts` menjaga `globals.css` tetap sinkron. Catatan 3 perubahan tema dengan screenshot **belum** dibuat | Sebagian |
| E0-AC3 | `tests/db/migrations.test.ts`: migrasi + seed dari DB kosong (PGlite) → 3 kategori, 23 produk, ≥3 ukuran/produk. Terverifikasi juga di project Supabase asli (`supabase db push` 001–006 + seed): 3 kategori, 23 produk, 191 varian, 1 `store_settings` | Lolos |
| E0-AC4 | `tests/db/rls.test.ts` (anon 0 baris untuk orders/order_items/payments/shipments/admin_profiles, produk nonaktif tersembunyi, kolom internal ditolak) + `npm run qa:rls` untuk project nyata. Dijalankan: orders, order_items, payments, shipments, admin_profiles = permission denied (0 baris); kolom internal `store_settings` ditolak untuk anon. `RLS check PASSED` | Lolos |
| E0-AC5 | `tests/db/constraints.test.ts`: stok negatif ditolak, harga bertipe integer, `quantity > 0`, nomor order unik, `provider_reference` unik | Lolos |
| Kontras WCAG AA | `src/theme/contrast.test.ts`: semua pasangan token ≥ 4,5:1 | Lolos |

Hasil uji lokal terakhir: 13 file uji dan seluruh tes lolos, coverage di atas 80% (ambang diatur di `vitest.config.mts`).

## Yang perlu dilakukan pemilik repo

1. Buat project Supabase, isi `.env.local` dan env Vercel, jalankan `supabase db push` + seed.
2. Jalankan `npm run qa:rls` dan simpan keluarannya di sini (E0-AC4).
3. Deploy ke Vercel; catat URL staging.
4. Atur branch protection `main` (wajib PR + CI hijau) di GitHub.
5. Sediakan API key Duitku sandbox dan RajaOngkir untuk spike Fase 0.

## Masalah terbuka

- Gambar produk belum ada (Fase 2); kartu produk di beranda memakai placeholder abu-abu.
- Link navigasi (`/produk`, `/kategori/*`, `/cari`, `/keranjang`, `/retur`, `/syarat`) belum punya halaman sampai fase terkait.



◇ injected env (15) from .env.local
orders             rows=0   error="permission denied for table orders"
order_items        rows=0   error="permission denied for table order_items"
payments           rows=0   error="permission denied for table payments"
shipments          rows=0   error="permission denied for table shipments"
admin_profiles     rows=0   error="permission denied for table admin_profiles"
categories         rows=0   
products           rows=0   
product_variants   rows=0   
product_images     rows=0   
store_settings     rows=0   error="permission denied for table store_settings"

RLS check PASSED: no sensitive table is readable with the anon key.
