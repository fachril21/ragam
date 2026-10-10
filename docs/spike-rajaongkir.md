# Spike RajaOngkir (E4-AC0) — belum dijalankan

Status: **menunggu API key**. Isi dokumen ini setelah key tersedia di `.env.local` (`RAJAONGKIR_API_KEY`,
`RAJAONGKIR_BASE_URL`). Jangan menulis kode produksi di spike; cukup skrip uji di `scripts/spike/`.

## Yang harus dibuktikan

| # | Pertanyaan | Hasil |
| --- | --- | --- |
| 1 | Bentuk respons pencarian destinasi (kecamatan/kota) dan field ID tujuan | |
| 2 | Hitung ongkir untuk 3 pasang asal-tujuan × 4 kurir (JNE, J&T, SiCepat, POS): field layanan, harga, estimasi | |
| 3 | Apakah endpoint tracking resi tersedia di paket Starter? Bila tidak, pesan kesalahannya | |
| 4 | Latensi p50 / p95 per endpoint (10 panggilan) | |
| 5 | Perilaku saat batas 100 hit/hari habis (kode HTTP, pesan, apakah hit gagal terhitung) | |

## Keputusan

- Bila tracking tidak tersedia: E4-US3 memakai fallback (nomor resi + tautan halaman lacak kurir), dicatat sebagai deviasi PRD.
