# Fase 3 — E4 Ongkir dan tracking: rencana implementasi

Sumber: `docs/Development Phases — Template Toko Online Fashion UMKM.md` (Fase 3, E4-AC0..AC6), `docs/spike-rajaongkir.md`.
Branch kerja: `feat/3-ongkir` dari `main` (setelah tag `v0.1.0`). Tag penutup: `v0.3.0`.

## Keputusan desain

| # | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Cache ongkir/tracking/destinasi di tabel Supabase (`shipping_cache`), bukan memori proses | Vercel serverless: memori tidak dibagi antar instance dan hilang saat cold start, sehingga cache memori tidak melindungi kuota 100 hit/hari |
| D2 | Rate limit 10 req/menit/IP lewat tabel `rate_limits` + fungsi SQL atomik | Alasan sama dengan D1; memori proses tidak menjamin batas |
| D3 | Satu panggilan `calculate/domestic-cost` dengan semua kurir aktif (`jne:jnt:sicepat:pos`), cache per (asal, tujuan, berat) | Spike: 1 hit untuk semua kurir. Filter kurir dilakukan setelah cache, jadi mengubah `active_couriers` tidak memicu hit baru |
| D4 | Allowlist layanan reguler/ekspres per kurir di `src/core/integrations/rajaongkir/services.ts` | Spike: respons memuat kargo dan barang berbahaya (JTR, SPS, GOKIL, PAKETPOS DANGEROUS/VALUABLE, POS KARGO) |
| D5 | Berat dihitung server dari `product_variants`/produk, dibulatkan ke atas per 500 g, minimum 500 g, maksimum 20 kg | Klien tidak dipercaya (E4-AC2, PRD) |
| D6 | Tabel baru hanya diakses service role; RLS aktif tanpa policy untuk anon/authenticated | Konsisten dengan tabel sensitif Fase 1 |
| D7 | Kolom berat: cek skema; bila belum ada, migrasi 007 menambah `weight_grams` ke `products` | Perlu verifikasi di langkah 1 |

## Langkah (urutan dependensi)

1. **Skema (migrasi 007)** — `shipping_cache(key text pk, kind text, payload jsonb, expires_at timestamptz)`, `api_usage(day date, provider text, endpoint text, calls int, failures int, pk(day,provider,endpoint))`, `rate_limits(bucket text, window_start timestamptz, hits int, pk(bucket,window_start))`, fungsi `increment_api_usage(...)` dan `consume_rate_limit(bucket, max, window_seconds)`; RLS aktif tanpa policy. Tes PGlite di `tests/db/`.
2. **Adapter** `src/core/integrations/rajaongkir/` — `types.ts`, `errors.ts` (`TIMEOUT`, `QUOTA_EXCEEDED`, `UPSTREAM_ERROR`, `INVALID_INPUT`, `NOT_FOUND`), `client.ts` (fetch + timeout 8 s + retry 1x untuk error jaringan), `services.ts`, `index.ts`. `import "server-only"`; kunci dari `parseServerEnv`.
3. **Lapisan cache + usage** `src/core/shipping/` — `cache.ts`, `usage.ts` (`recordCall`, `getQuotaStatus`), `weight.ts` (fungsi murni), `rate-limit.ts`, `rates.ts` (orkestrasi: validasi → berat → cache → upstream → filter kurir → urut harga).
4. **Route handler** `GET /api/shipping/destinations`, `POST /api/shipping/rates`, `GET /api/shipping/track`.
5. **UI** `DestinationPicker` (client; debounce 300 ms, min 3 karakter, keyboard, status loading/kosong/error), `RateList`, `TrackingTimeline`, halaman uji `/dev/ongkir` (hanya di non-produksi, 404 di produksi seperti `/design`).
6. **Skrip QA** `scripts/qa/shipping-cache.ts`; env: tidak ada env baru (kunci sudah ada).
7. **Dokumen** `docs/phase-3.md`, README status; tag `v0.3.0` setelah PR hijau.

## Edge cases dan kasus negatif

| ID | Kasus | Perilaku yang diharapkan |
| --- | --- | --- |
| E1 | `RAJAONGKIR_API_KEY`/`BASE_URL` kosong | Endpoint mengembalikan `CONFIG_ERROR` 503 jelas; app tetap boot (env opsional) |
| E2 | `store_settings.origin_destination_id` kosong | `rates` mengembalikan `CONFIG_ERROR` "asal pengiriman belum diatur" |
| E3 | `q` < 3 karakter, atau hanya spasi | 400 `INVALID_INPUT`, tanpa hit upstream |
| E4 | `q` sama dengan beda huruf/spasi ("Bandung ", "bandung") | Satu kunci cache, 1 hit |
| E5 | Timeout > 8 s | `TIMEOUT` 504; retry sekali; hit gagal tercatat |
| E6 | Upstream 429/kuota habis | `QUOTA_EXCEEDED` 429 tanpa retry; tombol WhatsApp berisi isi keranjang |
| E7 | Upstream 5xx / respons bukan JSON / bentuk tak sesuai | `UPSTREAM_ERROR` 502; tidak ada data parsial yang di-cache |
| E8 | Hasil kosong (rute tanpa layanan) | 200 dengan daftar kosong, pesan "tidak ada layanan", di-cache pendek (5 menit) |
| E9 | Berat 0, negatif, NaN, 20 kg+, item tak ada, varian nonaktif, jumlah 0 | 400 `INVALID_INPUT` |
| E10 | Klien mengirim berat/harga sendiri | Diabaikan; berat selalu dari DB |
| E11 | Kurir di luar `active_couriers` atau tak dikenal | Disaring/ditolak 400 |
| E12 | Layanan kargo/berbahaya di respons | Dibuang oleh allowlist (D4) |
| E13 | `etd` kosong (J&T) | Ditampilkan "estimasi tidak tersedia", tidak crash |
| E14 | 10 permintaan identik dalam 1 menit | 1 hit upstream (cache), 11+ ke atas dari satu IP kena 429 rate limit |
| E15 | Dua request identik bersamaan (cache miss serentak) | Maksimum 2 hit; tidak ada duplikat baris cache (upsert) |
| E16 | Cache kedaluwarsa tepat di batas TTL | Dianggap miss, diperbarui |
| E17 | Kuota ≥ 80% dari `api_daily_limit` | `getQuotaStatus().warning=true` dan `console.warn` sekali per hari |
| E18 | Kuota 100% | Panggilan non-cache diblok lokal (`QUOTA_EXCEEDED`) tanpa memukul API |
| E19 | Tracking: nomor order/HP tidak cocok | 404 generik (tidak membedakan salah order vs salah HP) |
| E20 | Tracking: `shipments.tracking_number` kosong | Tanpa hit upstream; respons "resi belum tersedia" |
| E21 | Tracking: resi tak dikenal kurir | `NOT_FOUND` + fallback nomor resi dan tautan kurir |
| E22 | Tracking diulang < 15 menit | Dari cache, 0 hit |
| E23 | Klien mengirim `courier`/`awb` mentah ke track | Ditolak; kurir/resi diambil dari DB |
| E24 | Kunci API muncul di bundle klien/respons/log | Tidak boleh; uji pencarian string di `.next/static` dan payload purity |
| E25 | Service-role client terimpor dari komponen klien | Gagal di `tests/architecture.test.ts` |
| E26 | `DestinationPicker`: ketik cepat, balapan respons | Hanya respons terbaru yang dipakai (abort request lama) |
| E27 | `DestinationPicker`: keyboard (↑ ↓ Enter Esc), fokus terlihat, target ≥ 44 px | Berfungsi tanpa mouse |
| E28 | `DestinationPicker`: refresh setelah memilih | Pilihan disimpan (sessionStorage) dan dipulihkan; data rusak diabaikan |
| E29 | Mode reduced-motion | Spinner tanpa animasi gerak |
| E30 | `/dev/ongkir` di produksi | 404 |

## Langkah manual testing (skrip akseptasi untuk pemilik repo)

1. Pastikan `.env.local` berisi `RAJAONGKIR_*`, jalankan migrasi 007 di Supabase (`supabase db push`), lalu isi asal pengiriman di `store_settings` (SQL disediakan di `docs/phase-3.md`). ✅ `npm run qa:rls` tetap PASSED dan tabel baru tidak terbaca anon.
2. `npm run dev`, buka `/dev/ongkir`. ✅ Halaman tampil.
3. Ketik "ba" di kolom tujuan. ✅ Tidak ada permintaan jaringan; ketik "ban" → tepat 1 permintaan setelah jeda 300 ms; daftar muncul.
4. Pilih "Bandung…", berat 1 kg, klik Hitung. ✅ Daftar tarif terurut harga, termurah bertanda, tanpa layanan kargo.
5. Klik Hitung lagi dengan input sama. ✅ Muncul penanda "dari cache"; angka `api_usage` tidak bertambah.
6. Ubah berat 0 g lalu 25 kg. ✅ Pesan validasi, tanpa hit.
7. Jalankan `npx tsx scripts/qa/shipping-cache.ts`. ✅ 10 permintaan, 1 hit upstream.
8. Uji 5 tujuan (kota besar, kecamatan kecil, luar Jawa) dan bandingkan dengan situs kurir. ✅ Selisih sesuai harapan.
9. Set `api_daily_limit` = 5 di `store_settings`, panggil sampai 4 hit. ✅ Peringatan 80% di log server; hit ke-6 → pesan kuota habis + tombol WhatsApp.
10. Isi `RAJAONGKIR_API_KEY` salah. ✅ Pesan error ramah, bukan stack trace.
11. Uji tracking dengan order contoh yang punya resi nyata (butuh resi dari pemilik repo). ✅ Timeline tampil; panggilan kedua < 15 menit tanpa hit; order tanpa resi → tanpa hit.
12. Tutup layar jaringan (offline di DevTools) lalu cari tujuan. ✅ Pesan jelas, picker tidak macet.

## Pemetaan acceptance criteria

| AC | Dicakup oleh |
| --- | --- |
| E4-AC0 | `docs/spike-rajaongkir.md` (selesai); tes adapter memakai bentuk respons spike |
| E4-AC1 | Langkah 4-5; E3, E4, E26, E27; manual 3 |
| E4-AC2 | Langkah 3-4, 6; E10, E14-E16; manual 5, 7 |
| E4-AC3 | Langkah 1, 3; E17, E18; manual 9 |
| E4-AC4 | Langkah 2, 5; E5-E8; manual 9, 10, 12 |
| E4-AC5 | Langkah 4; E19-E23; manual 11 |
| E4-AC6 | Langkah 2; E24, E25; pemindaian `.next/static` di `scripts/qa/` dan `tests/architecture.test.ts` |

## Yang butuh tindakan pemilik repo

- Menjalankan migrasi 007 (`supabase db push`) dan SQL pengisian asal pengiriman.
- Menyediakan 1 nomor resi nyata (dan kurirnya) untuk memverifikasi bentuk respons tracking (spike belum mengamatinya).
- Review plan ini sebelum eksekusi.
