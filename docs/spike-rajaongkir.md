# Spike RajaOngkir (E4-AC0)

Dijalankan 2026-10-10 dengan `scripts/spike/rajaongkir.mjs` (11 hit dari kuota 100/hari). Basis: Komerce v1,
`https://rajaongkir.komerce.id/api/v1/`, autentikasi lewat header `key`. Kunci tidak dicatat di sini.

## Hasil

| # | Pertanyaan | Hasil |
| --- | --- | --- |
| 1 | Bentuk respons destinasi | `GET destination/domestic-destination?search=&limit=&offset=` → `data[]` berisi `id`, `label`, `province_name`, `city_name`, `district_name`, `subdistrict_name`, `zip_code`. `id` level kelurahan (subdistrict) dipakai langsung sebagai asal/tujuan. Contoh: Bandung 4816, Kebayoran Lama Selatan 17549, Gubeng 69243, Petisah Tengah 41123 |
| 2 | Hitung ongkir 3 pasang × 4 kurir | `POST calculate/domestic-cost` (form-urlencoded: `origin`, `destination`, `weight` gram, `courier` kode dipisah `:` mis. `jne:jnt:sicepat:pos`, `price=lowest`). Satu panggilan mengembalikan semua kurir. Field: `code`, `name`, `service`, `description`, `cost`, `etd`. Lihat tabel di bawah |
| 3 | Tracking di paket ini | **Tersedia** (tidak diblokir paket). `POST track/waybill` (`awb`, `courier`, `last_phone_number`). Resi palsu → 404 `Invalid Awb`; `awb` kosong → 422. Bentuk respons sukses belum teramati karena belum ada resi nyata (lihat Keputusan) |
| 4 | Latensi | Sampel kecil (hemat kuota): destinasi 224-259 ms (n=5); ongkir 440 / 795 / 931 ms (n=3); tracking 314-937 ms (n=2). Jauh di bawah target E2-AC2 (≤ 3 s p95), tetapi n terlalu kecil untuk p95 |
| 5 | Kuota habis | **Tidak diuji** agar tidak menghabiskan kuota harian. Respons tidak membawa header sisa kuota/rate limit, jadi sisa kuota harus dihitung sendiri (E4-AC3). Key salah → HTTP 400 `Invalid Api key, key not found` |

### Temuan yang memengaruhi desain

- Satu panggilan `calculate` untuk semua kurir sekaligus (1 hit, bukan 4). Cache per kurir tidak perlu; cache per (asal, tujuan, berat).
- Respons mencampur layanan kargo dan barang khusus (JNE `JTR`, `JTR<130`, `SPS`; SiCepat `GOKIL`; POS `PAKETPOS DANGEROUS/VALUABLE GOODS`, `POS KARGO`) dengan harga 100 ribu sampai jutaan. Adapter memakai **allowlist layanan** untuk toko fashion.
- Kode HTTP error ada di `meta.code`; pesan di `meta.message`.
- J&T (`EZ`) tidak muncul untuk rute Bandung → Jakarta Selatan; ketersediaan kurir bergantung rute, UI tidak boleh mengasumsikan keempat kurir selalu ada.
- `etd` J&T kosong; UI harus menangani estimasi kosong.

### Tarif contoh (layanan reguler)

| Rute | Berat | POS Reguler | SiCepat REG | JNE REG | J&T EZ |
| --- | --- | --- | --- | --- | --- |
| Bandung → Jakarta Selatan | 1000 g | 9.900 | 11.000 | 13.000 | - |
| Jakarta Selatan → Surabaya | 1500 g | 32.400 | 36.000 | 40.000 | 36.000 |
| Surabaya → Medan | 2000 g | 81.000 | 90.000 | 114.000 | 90.000 |

## Keputusan

- Tracking tersedia, jadi E4-US3 memakai RajaOngkir; fallback (nomor resi + tautan kurir) tetap dibuat untuk error dan resi tak dikenal.
- Hasil tracking sukses perlu dikonfirmasi dengan resi nyata sebelum `TrackingTimeline` dikunci (tindakan pemilik repo).
- Uji kuota habis dilakukan di tes dengan klien mock, bukan di API nyata.
