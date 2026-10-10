# Fase 3 — E4 Ongkir dan tracking RajaOngkir

Status: **kode selesai, menunggu verifikasi langsung** (migrasi 007 belum dijalankan di Supabase, asal pengiriman toko belum diisi, belum ada resi nyata).

Rencana, edge case bernomor (E1-E30), dan langkah uji manual ada di `docs/plan/phase-3-implementation-plan.md`.
Hasil spike (bentuk respons, latensi, perilaku error) ada di `docs/spike-rajaongkir.md`.

## Keputusan

| Keputusan | Alasan |
| --- | --- |
| Cache, pencatatan pemakaian, dan rate limit disimpan di Supabase (`shipping_cache`, `api_usage`, `rate_limits`, migrasi 007), bukan memori proses | Vercel serverless: memori tidak dibagi antar instance dan hilang saat cold start, jadi cache memori tidak melindungi kuota 100 hit/hari |
| Satu panggilan `calculate/domestic-cost` untuk semua kurir; cache per (asal, tujuan, berat terbulatkan) | Spike: satu hit mengembalikan semua kurir. Filter kurir aktif dilakukan setelah cache sehingga mengubah `active_couriers` tidak memakai kuota |
| Allowlist layanan retail per kurir (`rajaongkir/services.ts`) | Respons memuat layanan kargo/barang berbahaya berharga ratusan ribu sampai jutaan (JNE JTR/SPS, SiCepat GOKIL, PAKETPOS DANGEROUS/VALUABLE GOODS, POS KARGO) |
| Berat dihitung di server dari `product_variants.weight_grams`, dibulatkan ke atas per 500 g (min 500 g, maks 20 kg) | Klien tidak dipercaya; field berat/harga dari klien diabaikan oleh skema validasi |
| Rate limit: destinasi 10/menit, tarif 20/menit, tracking 10/menit per IP, dengan fixed window atomik di SQL | PRD bagian 11. Bila pembatas sendiri error, request diloloskan (fail open) agar gangguan DB tidak mematikan checkout |
| Fungsi counter (`increment_api_usage`, `consume_rate_limit`) hanya bisa dipanggil service role | `revoke` dari `public`, `anon`, `authenticated` (default privilege Supabase memberi `execute` langsung ke anon, sehingga `revoke from public` saja tidak cukup; tertangkap oleh tes PGlite) |
| Tracking mengambil kurir dan resi dari database setelah verifikasi (nomor order + HP); salah order dan salah HP memberi respons 404 yang sama | E4-AC5, mencegah probing nomor order |
| Route handler memanggil `connection()` sebelum `try/catch` | Akses `request.*` menghentikan prerender lewat error internal Next; menelannya di `catch` menyembunyikan sinyal itu (terlihat sebagai log saat build) |

## Deviasi dari dokumen fase

- **Tautan halaman lacak kurir tidak dibuat.** Plan menyebut fallback "nomor resi + tautan kurir". URL halaman lacak JNE/J&T/SiCepat/POS tidak bisa diverifikasi (sebagian memblokir bot, sebagian mengalihkan ke beranda), jadi fallback menampilkan kurir + nomor resi dengan tombol salin, tanpa URL yang belum terbukti benar.
- **Bentuk respons tracking sukses belum teramati.** Endpoint tersedia di paket ini (resi palsu → 404 `Invalid Awb`), tetapi tanpa resi nyata parser `track/waybill` dibuat toleran dan hanya diuji dengan payload buatan. Perlu 1 resi nyata untuk memastikan.
- **Uji kuota habis hanya dengan mock.** Tidak diuji ke API sungguhan agar kuota harian tidak terbuang.
- **Uji performa E2-AC2** (ongkir ≤ 3 s p95 / ≤ 500 ms dari cache) belum diukur dengan sampel cukup; sampel spike kecil (ongkir 440-931 ms).

## Bukti acceptance criteria

| Kode | Bukti | Status |
| --- | --- | --- |
| E4-AC0 | `docs/spike-rajaongkir.md` | Lolos |
| E4-AC1 | `useDestinationSearch.test.tsx`: debounce tepat 300 ms, minimal 3 karakter, request lama dibatalkan; `DestinationPicker.test.tsx`: ARIA combobox, keyboard, target 44 px. Rekaman layar: **belum** | Sebagian |
| E4-AC2 | `service.test.ts`: 10 permintaan identik → 1 hit upstream. `npm run qa:shipping-cache` terhadap database nyata: **belum dijalankan** | Sebagian |
| E4-AC3 | `shipping.test.ts` (PGlite) untuk `increment_api_usage`; `service.test.ts` untuk peringatan 80% satu kali dan blokir lokal di 100%. Uji dengan batas buatan di database nyata: **belum** | Sebagian |
| E4-AC4 | `client.test.ts` (timeout, 429, 5xx, JSON rusak, bentuk tak dikenal), `service.test.ts`, `handlers.test.ts`, `DestinationPicker.test.tsx` (pesan + tombol WhatsApp) | Lolos |
| E4-AC5 | `tracking.test.ts` (order/HP salah, resi kosong), `handlers.test.ts`, `service.test.ts` (cache 15 menit). Resi nyata: **belum** | Sebagian |
| E4-AC6 | `npm run qa:bundle-secrets` setelah `npm run build`: 5 secret dipindai di `.next/static`, tidak ada yang bocor. Plus uji arsitektur (`import "server-only"`) | Lolos |

Hasil uji lokal terakhir: 26 file uji, 306 tes lolos; coverage lines 94,9% (ambang 80%); `tsc`, `eslint`, dan `next build` bersih.

## Yang perlu dilakukan pemilik repo

1. Jalankan migrasi 007: `supabase db push`.
2. Isi asal pengiriman dan kurir aktif (SQL Editor). Cari ID asal lewat `/dev/ongkir` atau
   `curl "https://rajaongkir.komerce.id/api/v1/destination/domestic-destination?search=<kecamatan>" -H "key: <API_KEY>"`:
   ```sql
   update public.store_settings
   set origin_destination_id = '<id>', origin_label = '<label>',
       active_couriers = '{jne,sicepat,jnt,pos}';
   ```
3. Tambahkan `RAJAONGKIR_API_KEY` dan `RAJAONGKIR_BASE_URL` (`https://rajaongkir.komerce.id/api/v1/`) di Vercel (Production dan Preview).
4. Jalankan `npm run qa:rls` (harus tetap PASSED dan kini mencakup 3 tabel baru).
5. Sediakan 1 nomor resi nyata beserta kurirnya untuk memverifikasi tracking, lalu isi satu baris `shipments` untuk order contoh.

## Masalah terbuka

- Hasil tracking sukses belum diverifikasi dengan resi nyata (lihat deviasi).
- Pembersihan baris `shipping_cache` kedaluwarsa belum dijadwalkan; baris lama hanya ditimpa saat kunci sama dipakai lagi. Cron pembersihan masuk Fase 5/8 bersama job lain.
- `getQuotaStatus()` sudah tersedia untuk banner peringatan 80% di dashboard admin; UI-nya dipasang di Fase 6.
