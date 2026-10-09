# Development Phases — Template Toko Online Fashion UMKM

Oct 7, 2026 · @Fachril

Dokumen ini memecah PRD menjadi 10 fase kerja berurutan (Fase 0 sampai 9) untuk membangun dummy template sampai siap didemokan ke calon klien. Tiap fase bisa dikerjakan sendiri-sendiri: punya tujuan, prasyarat, daftar tugas yang bisa dicentang, acceptance criteria dari PRD, dan gerbang (gate) yang harus lolos sebelum lanjut.

## Cara pakai dokumen ini

- Kerjakan fase sesuai urutan. Satu fase baru dianggap selesai kalau semua centang tugas terisi dan gate lolos.
- Kode AC (misal E3-AC4) merujuk langsung ke acceptance criteria di PRD. Jangan ubah artinya; kalau perlu diubah, ubah di PRD dulu.
- Estimasi dalam hari kerja untuk 1 developer penuh waktu. Ini perkiraan awal, bukan komitmen. Kamu bisa mengalikan sesuai jam kerja nyata per hari.
- Fase yang butuh pihak luar (verifikasi Duitku, kuota RajaOngkir) punya buffer waktu terpisah.
- Semua perubahan skema database lewat file migrasi SQL, tidak pernah lewat dashboard Supabase (aturan PRD bagian 6).

## Konvensi kerja (berlaku di semua fase)

| Aspek | Aturan |
| --- | --- |
| Branch | `main` selalu bisa di-deploy; kerja di `feat/<fase>-<topik>`; merge lewat pull request |
| Commit | Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`) supaya mudah membuat changelog dan tag versi |
| Tag versi | `v0.<fase>.<patch>` di akhir tiap fase, misal `v0.3.0` setelah Fase 3; tag ini nanti jadi acuan sinkronisasi ke repo klien |
| Folder kode | `src/core` (logika inti, jangan disesuaikan per klien), `src/theme` (token dan konfigurasi toko), `src/custom` (override per klien) |
| Rahasia | Semua kunci di `.env.local` (lokal) dan environment cPanel (server); tidak pernah di repo atau di bundle klien |
| Integrasi eksternal | Dibungkus adapter di `src/core/integrations/*` (Duitku, RajaOngkir) supaya perubahan API cukup di satu tempat |
| Uji | Unit test untuk logika harga, stok, status, dan signature; skrip uji konkurensi dan uji request manipulasi disimpan di `scripts/qa/` |

## Definition of Done (DoD) untuk setiap fase

Sebuah fase selesai bila semua poin ini terpenuhi:

- [ ] Semua tugas fase tercentang dan semua AC fase lolos dengan bukti (screenshot, log, atau output skrip).
- [ ] `npm run lint`, `npm run typecheck`, dan `npm run build` hijau di CI.
- [ ] Migrasi baru sudah dijalankan ulang dari nol di project Supabase kosong tanpa error.
- [ ] Staging di Nimbus Go sudah di-deploy ulang dengan build fase ini dan smoke test lolos.
- [ ] Catatan keputusan, deviasi dari PRD, dan masalah terbuka ditulis di `docs/phase-<n>.md`.
- [ ] Tag versi dibuat dan changelog singkat ditulis.

## Peta fase dan urutan

Total estimasi 63-80 hari kerja untuk satu developer (sekitar 13-16 minggu), dibagi tiga tahap sesuai PRD bagian 7, dengan Fase 5 (pembayaran) sebagai fase paling berisiko.

&#91;embedded content: peta 10 fase dalam 3 tahap · estimasi hari kerja\]

Panah menunjukkan urutan kerja dan setiap panah adalah gate: fase berikutnya baru dimulai setelah gate fase sebelumnya lolos. PRD membolehkan epic dalam satu tahap dikerjakan paralel, tetapi karena kamu mengerjakan sendiri, urutan di atas dikerjakan satu per satu.

**Alasan urutan**

- Ongkir (Fase 3) sebelum checkout (Fase 4), karena PRD mencatat E4 dipakai oleh E2 untuk ongkir di checkout dan oleh E5 untuk resi.
- Pembayaran (Fase 5) butuh checkout dan skema order dari Fase 1, sesuai ketergantungan E3 di PRD.
- Admin (Fase 6) setelah pembayaran supaya transisi status dan resi memakai logika yang sudah teruji. Sebelum itu produk diisi lewat seed. Bila ingin mengisi produk lewat UI lebih awal, bagian 6.1-6.3 boleh dimajukan tepat setelah Fase 2 karena E5 hanya butuh E1 untuk pratinjau.
- Konten/SEO dan monitoring (Fase 7-8) baru masuk setelah alur inti stabil, supaya tidak diulang saat desain berubah.
- Fase 9 adalah gerbang penutup yang membuktikan tujuan G1 sampai G5 PRD.

**Hal yang tidak termasuk estimasi:** waktu tunggu aktivasi akun Duitku/RajaOngkir, perbaikan setelah uji pengguna yang besar, dan pembuatan foto AI di luar yang dijadwalkan di Fase 2. Estimasi dihitung untuk 1 developer penuh waktu; sesuaikan dengan jam kerja nyata dan tambahkan buffer 20% untuk Fase 5.

## Fase 0 — Persiapan akun, tooling, dan spike

Fase 0 memastikan semua akun, kunci sandbox, dan alat kerja siap, plus membuktikan dua hal yang belum pasti: endpoint RajaOngkir di paket Starter dan alur Create Invoice Duitku. Estimasi: 2-3 hari kerja (belum termasuk menunggu aktivasi akun dari pihak luar).

**Prasyarat:** PRD final, akses ke akun DomaiNesia, GitHub, dan email untuk mendaftar layanan.

**Output:** akun dan kunci sandbox siap, repo kosong dengan CI, dan dokumen hasil spike (lampiran PRD sesuai E4-AC0).

### Tugas

**A. Akun dan akses**

- [ ] Buat organisasi GitHub atau pakai akun pribadi; buat repo `toko-fashion-template` sebagai **template repository** (Settings → Template repository).
- [ ] Buat project Supabase Free untuk dev (`toko-template-dev`). Catat Project URL, anon key, dan service role key di password manager, bukan di chat atau repo.
- [ ] Buat satu project Supabase Free kedua untuk staging bila slot masih ada (batas Free: 2 project). Bila tidak, staging berbagi dengan dev dan dibedakan dengan prefix data.
- [ ] Daftar akun Duitku, aktifkan **mode sandbox**, dapatkan merchant code dan API key sandbox.
- [ ] Daftar akun RajaOngkir/Komerce, ambil API key paket Starter.
- [ ] Di cPanel DomaiNesia: cek menu **Setup Node.js App**, versi Node yang tersedia, batas proses dan memori paket Nimbus Go, serta apakah SSH tersedia.
- [ ] Siapkan subdomain staging (misal `staging.domainanda.com`) dan pasang SSL.
- [ ] Daftarkan domain ke Cloudflare (gratis) bila akan dipakai di Fase 8; boleh ditunda.

**B. Tooling lokal dan CI**

- [ ] Pasang Node.js LTS (samakan dengan versi di cPanel), pnpm atau npm, Supabase CLI, dan Git.
- [ ] Buat GitHub Actions minimal: `lint`, `typecheck`, `build` pada setiap pull request (syarat merge, PRD bagian 11).
- [ ] Aktifkan branch protection di `main`: wajib PR dan CI hijau.
- [ ] Pasang pemindai rahasia (gitleaks atau fitur secret scanning GitHub) dan tambahkan `.env*` ke `.gitignore`.
- [ ] Buat folder `docs/` dengan template catatan fase (`phase-template.md`: tujuan, keputusan, deviasi, masalah terbuka).

**C. Spike RajaOngkir (E4-AC0)**

Tujuannya mencari tahu apa yang benar-benar tersedia di Starter sebelum Fase 3 dirancang. Jangan menulis kode produksi di spike ini; cukup skrip uji (curl atau skrip Node di `scripts/spike/`).

- [ ] Uji endpoint pencarian destinasi (kecamatan/kota) dengan beberapa kata kunci, catat bentuk respons dan field ID tujuan.
- [ ] Uji endpoint hitung ongkir untuk 3 asal-tujuan berbeda dan 4 kurir (misal JNE, J&T, SiCepat, POS); catat field layanan, harga, dan estimasi hari.
- [ ] Uji endpoint tracking resi (waybill) dengan resi nyata; catat apakah tersedia di Starter, dan bila tidak, apa pesan kesalahannya.
- [ ] Ukur latensi tiap endpoint (10 panggilan) dan catat p50 serta p95 sebagai dasar target E2-AC2.
- [ ] Verifikasi batas 100 hit per hari: apa yang terjadi saat habis (kode HTTP, pesan), apakah hit gagal ikut terhitung.
- [ ] Tulis hasilnya di `docs/spike-rajaongkir.md` dan lampirkan ke PRD.

**D. Spike Duitku sandbox**

- [ ] Buat satu invoice lewat Create Invoice (POP) memakai skrip, dapatkan URL pembayaran, dan bayar di sandbox.
- [ ] Catat bentuk callback (field, format signature, kapan dikirim) dan simulasikan callback ke endpoint lokal memakai tunnel (misal cloudflared) atau webhook tester.
- [ ] Uji API cek status transaksi untuk order yang belum dibayar dan yang sudah dibayar.
- [ ] Catat batas nominal minimum, masa berlaku invoice, dan metode bayar yang aktif di sandbox.
- [ ] Tulis hasilnya di `docs/spike-duitku.md`.

**E. Spike hosting Next.js di Nimbus Go**

- [ ] Buat aplikasi Next.js kosong dengan custom server, build di laptop, upload, dan jalankan lewat Setup Node.js App.
- [ ] Catat ukuran build, waktu start, penggunaan memori idle, dan apakah proses mati sendiri setelah idle.
- [ ] Uji apakah `sharp` atau pustaka native lain bisa jalan di server (PRD mengizinkan pemrosesan gambar di browser bila tidak).
- [ ] Tulis hasilnya di `docs/spike-hosting.md`, termasuk keputusan: lanjut di Nimbus Go atau siapkan cadangan (Cloud VPS).

### Gate Fase 0

| Gate | Bukti |
| --- | --- |
| Semua akun dan kunci sandbox ada | Daftar akun di password manager (tanpa isi kunci di dokumen) |
| Hasil spike RajaOngkir tertulis, termasuk status endpoint tracking di Starter | `docs/spike-rajaongkir.md` |
| Create Invoice dan callback Duitku sandbox terbukti jalan | `docs/spike-duitku.md` dengan contoh payload (kunci disamarkan) |
| Next.js kosong jalan di staging Nimbus Go lewat HTTPS | URL staging dan catatan resource |
| CI hijau di repo kosong | Tautan run GitHub Actions |

**Bila gate gagal:** kalau tracking tidak tersedia di Starter, E4-US3 tetap dikerjakan tetapi dengan fallback (tautan ke halaman lacak kurir) dan hasilnya dicatat sebagai deviasi PRD. Kalau Nimbus Go tidak stabil, putuskan sekarang apakah pindah ke cadangan, jangan menunggu sampai Fase 1.

## Fase 1 — E0 Fondasi: scaffold, design token, database

Fase 1 menghasilkan repo template yang bisa di-clone, di-build, di-deploy ke staging, dan diubah tampilannya hanya lewat `src/theme`. Estimasi: 6-8 hari kerja.

**Prasyarat:** Gate Fase 0 lolos.

**Output demo:** situs kosong bergaya Uniqlo di staging HTTPS, database lengkap dengan seed 20 produk, RLS aktif.

**Acceptance criteria dari PRD:** E0-AC1 sampai E0-AC5.

### 1.1 Scaffold aplikasi (E0-US1, E0-AC1)

- [ ] Inisialisasi Next.js (App Router, TypeScript strict, Tailwind) dan atur alias `@/` ke `src/`.
- [ ] Buat struktur folder: `src/core`, `src/theme`, `src/custom`, `src/app`, `src/components`, `supabase/migrations`, `scripts/qa`, `docs`.
- [ ] Pasang ESLint (aturan import: `core` tidak boleh meng-import dari `custom`), Prettier, dan husky + lint-staged untuk pre-commit.
- [ ] Buat custom server (`server.js`) untuk Setup Node.js App cPanel; pastikan port dibaca dari environment dan mode produksi dipakai.
- [ ] Buat `next.config` dengan `images` yang mengizinkan domain Supabase Storage dan output yang kompatibel dengan build di luar server.
- [ ] Buat skrip `npm run build:package` yang menghasilkan folder siap upload (build + `node_modules` produksi + server) untuk dipakai di Fase ini dan seterusnya.
- [ ] Pasang validasi environment (misal zod) di `src/core/env.ts`: aplikasi gagal start dengan pesan jelas bila variabel wajib hilang. Pisahkan variabel server dan variabel publik.

### 1.2 Sistem desain dan tema (E0-US1, E0-AC2)

Prinsip visual dari PRD: whitespace banyak, foto produk besar, palet netral, navigasi konvensional.

- [ ] Definisikan token di `src/theme/tokens.ts` dan petakan ke CSS variables di Tailwind: warna primer, netral (skala 50-900), aksen, semantik (sukses, peringatan, error), font sans, radius, spacing, dan bayangan.
- [ ] Buat `src/theme/store.config.ts`: nama toko, logo, tagline, kontak WhatsApp, email, alamat, jam layanan, tautan media sosial, ID analytics.
- [ ] Pasang font lewat `next/font` dengan fallback (jangan memuat font eksternal lewat tag manual).
- [ ] Bangun komponen dasar di `src/components/ui`: Button, Input, Select, Checkbox, Radio, Badge, Skeleton, Toast, Modal/Drawer, Breadcrumb, Pagination, Accordion.
- [ ] Bangun layout global: header (logo, menu kategori, pencarian, ikon keranjang), footer (kontak, jam layanan, tautan retur/syarat), dan kerangka mobile (menu hamburger, header lengket).
- [ ] Buat halaman `/design` (hanya dev) yang menampilkan semua komponen dan token untuk pengecekan visual.
- [ ] Uji E0-AC2: ubah warna primer, font, dan nama toko (3 perubahan berbeda) lalu pastikan seluruh situs berubah tanpa menyentuh komponen. Catat hasilnya.
- [ ] Cek kontras warna default terhadap WCAG 2.1 AA (rasio ≥ 4,5:1) supaya Fase 4 tidak perlu diperbaiki ulang.

### 1.3 Skema database dan migrasi (E0-US2, E0-AC3, E0-AC5)

Draft kolom ada di Lampiran. Aturan: semua perubahan lewat `supabase/migrations/*.sql`, harga bilangan bulat rupiah, stok tidak boleh negatif.

- [ ] Migrasi 001: tipe enum (`order_status`, `payment_status`, `shipment_status`) dan fungsi util (`set_updated_at`).
- [ ] Migrasi 002: `categories`, `products`, `product_variants`, `product_images`.
- [ ] Migrasi 003: `orders`, `order_items`, `payments`, `shipments`.
- [ ] Migrasi 004: `store_settings` (satu baris) dan `admin_profiles`.
- [ ] Tambahkan constraint: `stock >= 0`, `price >= 0` (integer), `quantity > 0`, nomor order unik, dan unique pada `payments.provider_reference` untuk mencegah pembayaran ganda.
- [ ] Tambahkan indeks: `products(slug)`, `products(category_id, is_active)`, `product_variants(product_id)`, `orders(order_number)`, `orders(status, created_at)`, `payments(order_id)`.
- [ ] Buat kolom `search_vector` (tsvector) atau indeks trigram pada `products` untuk pencarian di Fase 2.
- [ ] Buat bucket Storage `product-images` (publik baca, tulis hanya admin).
- [ ] Tulis seed `supabase/seed.sql`: 3 kategori, minimal 20 produk (kaos, kerudung, dan sejenisnya), 3 ukuran per produk, 2-3 warna pada sebagian produk, tabel ukuran dalam cm, dan `store_settings` awal.
- [ ] Uji E0-AC3: jalankan semua migrasi + seed di project Supabase **kosong baru** dan cocokkan dengan daftar tabel di PRD.

### 1.4 Keamanan data: RLS (E0-AC4)

- [ ] Aktifkan RLS di semua tabel (`alter table ... enable row level security`).
- [ ] Kebijakan baca publik hanya untuk: kategori dan produk aktif, varian dan gambar dari produk aktif, serta kolom publik `store_settings`.
- [ ] Tabel `orders`, `order_items`, `payments`, `shipments`: tanpa kebijakan untuk anon (hasil 0 baris). Akses hanya lewat server dengan service role.
- [ ] Kebijakan tulis untuk admin: periksa keberadaan `auth.uid()` di `admin_profiles`.
- [ ] Buat skrip `scripts/qa/rls-check.ts` yang memakai anon key dan mencoba membaca semua tabel; keluaran harus menunjukkan tabel sensitif 0 baris atau ditolak. Jalankan di CI bila memungkinkan.
- [ ] Pastikan `store_settings` tidak membocorkan field internal (misal token job) ke anon; pisahkan tabel rahasia bila perlu.

### 1.5 Klien Supabase dan struktur akses data

- [ ] Buat `src/core/supabase/server.ts` (service role, hanya dipakai di route handler/server action) dan `public.ts` (anon, untuk baca etalase).
- [ ] Buat generator tipe (`supabase gen types`) dan skrip `npm run db:types`.
- [ ] Buat lapisan akses data `src/core/data/*` (misal `getProducts`, `getProductBySlug`) supaya komponen tidak memanggil Supabase langsung.
- [ ] Tambahkan lint rule atau uji sederhana yang memastikan file berlabel client tidak meng-import `server.ts`.

### 1.6 Deploy staging (E0-US3, E0-AC1)

- [ ] Jalankan build via `build:package`, upload ke folder aplikasi, atur environment di Setup Node.js App, dan restart.
- [ ] Tulis `docs/deploy.md`: langkah deploy, cara rollback ke build sebelumnya, dan daftar environment yang dibutuhkan. Ini cikal bakal runbook E7-AC6.
- [ ] Verifikasi HTTPS, redirect HTTP ke HTTPS, dan halaman beranda dummy memuat data seed dari Supabase.
- [ ] Catat penggunaan memori dan CPU setelah deploy sebagai baseline.

### Gate Fase 1

| Gate | Bukti |
| --- | --- |
| E0-AC1 | `npm run build` hijau di CI; URL staging HTTPS terbuka |
| E0-AC2 | Catatan 3 perubahan tema dengan before/after screenshot |
| E0-AC3 | Log migrasi pada project Supabase kosong; hitungan seed (≥ 20 produk, 3 kategori, 3 ukuran/produk) |
| E0-AC4 | Keluaran `rls-check` dengan anon key |
| E0-AC5 | Uji insert stok negatif ditolak; kolom harga bertipe integer |
| Dokumentasi | `docs/deploy.md` dan `docs/phase-1.md`; tag `v0.1.0` |

## Fase 2 — E1 Katalog dan halaman produk

Fase 2 membangun etalase: listing, filter, pencarian, dan halaman produk yang membantu pembeli memilih ukuran dengan yakin. Estimasi: 8-10 hari kerja.

**Prasyarat:** Gate Fase 1 lolos (komponen UI, tema, seed, RLS).

**Output demo:** pembeli bisa menelusuri 20+ produk di mobile, memfilter, mencari, membuka detail produk, dan menanyakan produk lewat WhatsApp.

**Acceptance criteria dari PRD:** E1-AC1 sampai E1-AC7.

### 2.1 Aset gambar dummy

PRD memutuskan gambar dummy dihasilkan AI. Kerjakan di awal supaya desain bisa dinilai dengan foto yang layak.

- [ ] Tentukan gaya foto yang konsisten (latar polos netral, model manusia, rasio 4:5) dan tulis prompt standar di `docs/image-prompts.md`.
- [ ] Hasilkan foto untuk 20 produk, minimal 3 foto per produk (depan, detail, model), plus gambar banner beranda.
- [ ] Proses ke WebP rasio 4:5: utama 1200 px sisi panjang ≤ 150 KB, thumbnail 400 px ≤ 60 KB (spesifikasi sama dengan E5-AC2).
- [ ] Upload ke bucket `product-images` lewat skrip `scripts/seed-images.ts` dan perbarui `product_images` (URL, urutan, alt text deskriptif).
- [ ] Tambahkan label "Contoh produk — situs demo" di footer atau banner tipis, sesuai mitigasi risiko foto AI di PRD.

### 2.2 Halaman listing kategori (E1-US1, E1-AC1, E1-AC6)

- [ ] Rute `/kategori/[slug]` dan `/produk` (semua produk) sebagai Server Component dengan ISR (`revalidate` ≤ 60 detik).
- [ ] Grid produk responsif: 2 kolom di mobile, 3-4 di desktop; kartu produk berisi foto 4:5, nama, harga (format `Rp1.250.000` lewat util `formatRupiah`), dan indikator warna bila ada.
- [ ] Paginasi 24 produk per halaman lewat parameter URL `?page=`.
- [ ] Pemuatan gambar: 4 gambar pertama `priority`, sisanya `loading="lazy"`, `sizes` yang benar, dan dimensi tetap supaya tidak ada layout shift.
- [ ] Tampilkan status "Stok habis" pada kartu bila semua varian 0.
- [ ] Halaman kosong yang ramah (filter tanpa hasil) dengan tombol reset filter.
- [ ] Skeleton untuk loading dan `not-found` untuk kategori tidak valid.

### 2.3 Filter dan pengurutan (E1-US2, E1-AC2)

- [ ] Desain filter desktop sebagai sidebar tetap (mengikuti pelajaran Adidas) dan filter mobile sebagai drawer dari bawah dengan tombol "Terapkan" dan jumlah hasil.
- [ ] Filter ukuran, warna, dan rentang harga; kombinasi bersifat AND.
- [ ] Urutan: terbaru, harga terendah, harga tertinggi.
- [ ] Seluruh state filter hidup di query string (`?size=M&color=hitam&min=50000&max=200000&sort=price_asc`) dan dibaca di server supaya bisa dibagikan.
- [ ] Pastikan tombol Back mempertahankan filter: gunakan `router.push` untuk perubahan filter yang disengaja dan hindari `replace` yang menghapus riwayat. Uji 3 skenario (filter → detail → Back; filter → ganti halaman → Back; filter → refresh).
- [ ] Hitung pilihan filter yang tersedia dari data (ukuran dan warna yang benar-benar ada di kategori itu) lewat query terpisah atau view SQL.
- [ ] Tambahkan indeks yang diperlukan setelah memeriksa `EXPLAIN` untuk kombinasi filter terberat.

### 2.4 Halaman detail produk (E1-US3, E1-AC3, E1-AC4, E1-AC5)

- [ ] Rute `/produk/[slug]` dengan ISR dan `generateStaticParams` untuk produk teratas; sisanya on-demand.
- [ ] Galeri: gambar utama besar, thumbnail, geser di mobile, dan zoom beresolusi cukup (klik untuk lightbox atau hover zoom di desktop). Zoom memuat gambar 1200 px, bukan thumbnail.
- [ ] Pemilih warna dan ukuran: varian dengan stok 0 tampil non-aktif dengan penanda dan tidak bisa dipilih untuk keranjang (E1-AC3). Tampilkan info stok rendah (misal "Sisa 3") bila stok ≤ ambang yang bisa diatur.
- [ ] Panduan ukuran: tautan "Panduan ukuran" tepat di dekat pemilih ukuran yang membuka modal berisi tabel ukuran dalam cm (data dari `store_settings` atau tabel ukuran per kategori). Verifikasi terlihat tanpa scroll tambahan di layar 360 px (E1-AC4).
- [ ] Blok deskripsi, bahan, dan perawatan dalam accordion.
- [ ] Tombol "Tanya via WhatsApp" membuka `https://wa.me/<nomor>?text=<teks ter-encode>` dengan nama produk dan URL halaman (E1-AC5); nomor dari `store.config`.
- [ ] Tombol "Tambah ke Keranjang" disiapkan (fungsi penuh di Fase 4); sementara aksinya memakai stub yang jelas ditandai TODO.
- [ ] Produk terkait (kategori sama) di bagian bawah, maksimal 4.
- [ ] Breadcrumb dan tombol kembali ke listing dengan filter terjaga.

### 2.5 Pencarian (E1-US5, E1-AC7)

- [ ] Kotak pencarian di header (ikon di mobile yang membuka overlay) dan rute `/cari?q=`.
- [ ] Implementasi pencarian full-text atau trigram di Postgres atas nama, kategori, dan deskripsi singkat; tangani bahasa Indonesia sederhana (huruf kecil, tanpa aksen).
- [ ] Autosuggest ringan (maksimal 5 saran, debounce 250 ms) lewat route handler yang di-cache.
- [ ] Seed tambahan sampai 200 produk di database uji (skrip pembangkit) untuk mengukur p95 ≤ 500 ms; catat hasil di `docs/phase-2.md`.

### 2.6 Revalidasi dan performa dasar (E1-AC6)

- [ ] Buat route handler `POST /api/revalidate` yang dilindungi token rahasia, menerima daftar path atau tag, dan memanggil `revalidatePath`/`revalidateTag`. Fase 6 akan memakainya.
- [ ] Gunakan tag cache per produk dan per kategori supaya revalidasi tepat sasaran.
- [ ] Jalankan Lighthouse mobile pada listing dan detail produk sebagai baseline (target akhir LCP ≤ 2,5 detik, skor ≥ 85); catat angka dan temuan.
- [ ] Ukur ukuran JavaScript halaman listing (target ≤ 200 KB gzip) dan tunda komponen berat (lightbox, drawer filter) dengan dynamic import.

### Gate Fase 2

| Gate | Bukti |
| --- | --- |
| E1-AC1 | Screenshot jaringan: 4 gambar awal dimuat, sisanya lazy; rasio 4:5 konsisten |
| E1-AC2 | Catatan 3 skenario filter + Back |
| E1-AC3 | Rekaman layar varian stok 0 tidak bisa dipilih |
| E1-AC4 | Screenshot 360 px: tautan panduan ukuran terlihat tanpa scroll |
| E1-AC5 | Tautan `wa.me` yang dihasilkan, teks otomatis benar |
| E1-AC6 | Waktu revalidasi dari panggilan API sampai halaman berubah |
| E1-AC7 | Hasil pengukuran p95 pencarian pada 200 produk |
| Dokumentasi | `docs/phase-2.md` (baseline Lighthouse) dan tag `v0.2.0` |

## Fase 3 — E4 Ongkir dan tracking RajaOngkir

Fase 3 dikerjakan sebelum checkout karena E2 butuh ongkir di langkah pengiriman. Fokusnya adapter RajaOngkir yang hemat kuota: cache, pencatatan pemakaian, dan fallback saat gagal. Estimasi: 5-6 hari kerja.

**Prasyarat:** Gate Fase 0 (hasil spike RajaOngkir) dan Fase 1 (skema, klien Supabase).

**Output demo:** halaman uji internal `/dev/ongkir` tempat memilih tujuan, berat, dan kurir lalu melihat tarif; pemanggilan kedua dengan input sama tidak memukul API.

**Acceptance criteria dari PRD:** E4-AC0 sampai E4-AC6 (E4-US4 bagian pengaturan kurir selesai penuh di Fase 6).

### 3.1 Adapter dan tipe (E4-AC6)

- [ ] Buat `src/core/integrations/rajaongkir/` berisi `client.ts` (HTTP + timeout 8 detik + penanganan error), `types.ts`, dan `index.ts` yang mengekspos fungsi bersih: `searchDestination(q)`, `calculateCost(params)`, `trackWaybill(courier, awb)`.
- [ ] Kunci API dibaca dari environment server saja; pastikan tidak ada di bundle klien (uji dengan pencarian string di folder `.next/static`).
- [ ] Normalisasikan respons ke tipe internal (`DestinationOption`, `ShippingRate`, `TrackingResult`) supaya perubahan format API tidak merambat ke UI.
- [ ] Kunci versi API dan tulis tautan dokumentasi serta tanggal terakhir diperiksa di komentar kepala file.
- [ ] Klasifikasikan error: `TIMEOUT`, `QUOTA_EXCEEDED`, `UPSTREAM_ERROR`, `INVALID_INPUT`, `NOT_FOUND`. Dipakai oleh UI untuk memilih pesan.

### 3.2 Pencarian tujuan (E4-US1, E4-AC1)

- [ ] Route handler `GET /api/shipping/destinations?q=` dengan validasi minimal 3 karakter.
- [ ] Cache hasil per kata kunci (huruf kecil, trim) selama 24 jam; data wilayah jarang berubah.
- [ ] Komponen `DestinationPicker` (autocomplete): debounce 300 ms, navigasi keyboard, status loading dan kosong, serta penyimpanan pilihan (ID tujuan + label) untuk dipakai checkout.
- [ ] Rate limit 10 permintaan per menit per IP di endpoint ini (PRD bagian 11).

### 3.3 Hitung ongkir dan cache (E4-US2, E4-AC2)

- [ ] Route handler `POST /api/shipping/rates` menerima ID tujuan, daftar item (ID varian + jumlah), dan kurir opsional. Berat dihitung **di server** dari data varian, bukan dari klien.
- [ ] Bulatkan berat ke atas per 500 g (dengan berat minimum satu kelipatan) sebelum memanggil API.
- [ ] Kunci cache = hash(asal, tujuan, berat terbulatkan, kurir), TTL 30 menit. Pilih penyimpanan: tabel Supabase `shipping_cache` (tahan restart server) atau memori proses sebagai tahap awal. Tuliskan keputusan dan alasannya di `docs/phase-3.md`.
- [ ] Bila asal pengiriman belum diatur di `store_settings`, endpoint mengembalikan error konfigurasi yang jelas.
- [ ] Terapkan filter kurir aktif dari `store_settings.active_couriers` (default: semua kurir yang diuji di spike).
- [ ] Tampilkan hasil terurut harga, dengan label layanan dan estimasi hari; UI menandai pilihan termurah.
- [ ] Uji E2-AC2 lebih awal: ongkir ≤ 3 detik p95 untuk panggilan baru, ≤ 500 ms dari cache.

### 3.4 Pencatatan pemakaian dan peringatan kuota (E4-AC3)

- [ ] Tabel `api_usage` (tanggal, penyedia, endpoint, jumlah panggilan, jumlah gagal) dengan upsert harian.
- [ ] Bungkus klien supaya setiap panggilan non-cache menambah hitungan.
- [ ] Fungsi `getQuotaStatus()` menghitung persentase terhadap batas (default 100/hari, dapat diatur lewat `store_settings` supaya sesuai paket Pro nanti).
- [ ] Sediakan data untuk banner peringatan 80% di dashboard admin (UI-nya dipasang di Fase 6) dan log peringatan server saat melewati 80%.
- [ ] Hitung hasil spike: berapa panggilan per sesi checkout biasa (pencarian + tarif) dan estimasi jumlah checkout per hari yang muat di 100 hit.

### 3.5 Penanganan gagal (E4-AC4)

- [ ] Saat timeout, error upstream, atau kuota habis, API mengembalikan kode error terstruktur dan UI checkout menampilkan pesan jelas plus tombol WhatsApp berisi isi keranjang.
- [ ] Sistem **tidak boleh** membuat order tanpa ongkir; tambahkan validasi di server pada tahap pembuatan order (dikunci di Fase 5).
- [ ] Tambahkan percobaan ulang sekali untuk error jaringan sementara (bukan untuk kuota habis) dengan jeda singkat.
- [ ] Tulis uji dengan klien yang di-mock: timeout, 429/kuota habis, respons rusak, dan respons kosong.

### 3.6 Tracking resi (E4-US3, E4-AC5)

- [ ] Route handler `GET /api/shipping/track?order=&phone=` yang memverifikasi pasangan nomor order dan nomor HP sebelum memanggil kurir. Jangan menerima kurir dan resi mentah dari klien.
- [ ] Hanya memanggil RajaOngkir bila `shipments.tracking_number` terisi, dengan cache 15 menit per resi.
- [ ] Bila endpoint tracking tidak tersedia di Starter (hasil spike), tampilkan nomor resi dan tautan ke halaman pelacakan kurir sebagai fallback, dan catat deviasi.
- [ ] Komponen `TrackingTimeline` yang dipakai di halaman status pesanan (Fase 5).

### 3.7 Uji integrasi

- [ ] Skrip `scripts/qa/shipping-cache.ts`: 10 permintaan identik dalam 1 menit → hanya 1 panggilan upstream (diverifikasi dari tabel `api_usage`).
- [ ] Uji manual 5 tujuan berbeda (kota besar, kecamatan kecil, luar Jawa) dan bandingkan tarif dengan situs kurir.
- [ ] Uji berat ekstrem (0 g, 20 kg) dan pastikan validasi bekerja.

### Gate Fase 3

| Gate | Bukti |
| --- | --- |
| E4-AC0 | `docs/spike-rajaongkir.md` terlampir di PRD (sudah dari Fase 0) |
| E4-AC1 | Rekaman autocomplete: debounce 300 ms, minimal 3 karakter |
| E4-AC2 | Keluaran skrip `shipping-cache` dan tabel `api_usage` |
| E4-AC3 | Data kuota harian dan log peringatan 80% (uji dengan batas buatan kecil) |
| E4-AC4 | Uji mock gagal/timeout/kuota habis; pesan dan tombol WhatsApp tampil |
| E4-AC5 | Bukti resi kosong tidak memanggil API; cache 15 menit bekerja |
| E4-AC6 | Pencarian string kunci di build klien tidak menemukan apa pun |
| Dokumentasi | `docs/phase-3.md` dan tag `v0.3.0` |

## Fase 4 — E2 Keranjang dan checkout

Fase 4 membangun alur dari keranjang sampai form checkout dengan ongkir dan validasi server, tanpa akun pembeli. Pembayaran sungguhan menyusul di Fase 5, jadi akhir fase ini berhenti di "order siap dibayar". Estimasi: 7-9 hari kerja.

**Prasyarat:** Gate Fase 2 (halaman produk) dan Fase 3 (ongkir).

**Output demo:** pembeli menambah produk ke keranjang, mengisi data, memilih kurir, melihat total final, dan menekan tombol "Buat pesanan" yang menghasilkan ringkasan (belum membayar).

**Acceptance criteria dari PRD:** E2-AC1 sampai E2-AC5.

### 4.1 Keranjang di sisi klien (E2-US1)

- [ ] Store keranjang (Zustand atau React context + reducer) yang berisi `variant_id`, jumlah, dan snapshot ringan (nama, foto, harga saat ditambahkan) hanya untuk tampilan.
- [ ] Persistensi di `localStorage` dengan versi skema (`cart:v1`) dan penanganan data rusak atau kedaluwarsa; keranjang bertahan saat tab ditutup (E2-US1).
- [ ] Drawer mini-cart dari header dan halaman penuh `/keranjang`; ubah jumlah, hapus item, dan batas jumlah per item sesuai stok.
- [ ] Endpoint `POST /api/cart/validate` yang menerima daftar varian + jumlah dan mengembalikan harga serta stok terkini dari database; dipanggil saat keranjang dibuka dan saat masuk checkout.
- [ ] Tampilkan peringatan jelas bila harga berubah, stok berkurang, atau produk tidak lagi aktif, dan sesuaikan keranjang otomatis (E2-AC4).
- [ ] Hubungkan tombol Tambah ke Keranjang di halaman produk (ganti stub Fase 2) dengan umpan balik toast dan buka mini-cart.
- [ ] Sinkronkan keranjang antar tab lewat event `storage`.

### 4.2 Form checkout (E2-US2, E2-AC1, E2-AC5)

- [ ] Halaman `/checkout` dengan langkah ringkas dalam satu halaman: (1) kontak, (2) alamat dan tujuan, (3) pengiriman, (4) ringkasan dan konfirmasi. Ringkasan pesanan terlihat di mobile lewat panel yang bisa dibuka.
- [ ] Field wajib: nama, nomor HP, email, alamat lengkap, kota/kecamatan (lewat `DestinationPicker` dari Fase 3), dan kode pos bila diminta kurir. Catatan pesanan opsional.
- [ ] Validasi memakai skema bersama (zod) yang dipakai di klien **dan** server. Nomor HP: Indonesia, diawali `08` atau `62`; normalisasi ke format `62...` sebelum disimpan.
- [ ] Pesan error per field dalam Bahasa Indonesia, fokus otomatis ke field bermasalah, dan label yang terhubung ke input (aksesibilitas).
- [ ] Simpan draf isian di `sessionStorage` agar tidak hilang saat refresh; jangan menyimpan data sensitif lebih dari perlu.
- [ ] Pastikan semua langkah bisa diselesaikan di 360 px tanpa scroll horizontal dan kontras teks ≥ 4,5:1 (E2-AC5); jalankan audit axe atau Lighthouse aksesibilitas.
- [ ] Rate limit 10 permintaan per menit per IP di endpoint checkout (PRD bagian 11) dan honeypot sederhana untuk bot.

### 4.3 Ongkir di checkout (E2-US3, E2-AC2)

- [ ] Setelah tujuan dipilih, panggil `/api/shipping/rates` dan tampilkan daftar kurir dengan harga, layanan, dan estimasi; pilih yang termurah sebagai default tetapi tetap bisa diganti.
- [ ] Tampilkan skeleton selama memuat dan ulangi otomatis bila hanya perubahan keranjang yang terjadi (berat berubah).
- [ ] Total di ringkasan berubah real-time: subtotal + ongkir = total; tidak ada biaya tersembunyi.
- [ ] Saat ongkir gagal (E4-AC4), tampilkan pesan dan tombol WhatsApp yang sudah terisi isi keranjang; tombol "Buat pesanan" dinonaktifkan.
- [ ] Ukur waktu tampil ongkir (≤ 3 detik p95, ≤ 500 ms dari cache) di staging dan catat hasilnya.

### 4.4 Validasi server dan pembuatan draf order (E2-AC3, E2-AC4)

Kunci fase ini: server tidak percaya apa pun dari klien selain ID varian, jumlah, tujuan, dan pilihan kurir.

- [ ] Buat `src/core/orders/pricing.ts` (fungsi murni): hitung subtotal dari harga di database, ongkir dari penawaran ulang RajaOngkir untuk kurir terpilih, dan total. Tulis unit test untuk pembulatan, jumlah besar, dan varian tidak aktif.
- [ ] Buat `src/core/orders/checkout.ts` yang menerima payload, memvalidasi skema, memuat varian dari database, memverifikasi stok, menghitung ulang ongkir di server, dan mengembalikan **kutipan terhitung** (belum menyimpan order).
- [ ] Tolak dengan kode jelas bila ongkir atau harga di request tidak cocok dengan hitungan server, atau bila kurir yang dipilih tidak aktif di toko (E2-AC3).
- [ ] Bila stok kurang, kembalikan daftar item bermasalah beserta stok tersisa; UI menampilkan pesan dan memperbarui keranjang (E2-AC4).
- [ ] Buat generator nomor order yang tidak mudah ditebak tapi mudah dibaca (misal `TKO-250201-8F3K`) dengan cek unik di database.
- [ ] Skrip `scripts/qa/tamper.ts`: kirim 6 request yang dimanipulasi (harga diturunkan, ongkir 0, jumlah negatif, varian tidak ada, kurir tidak aktif, total salah) dan pastikan semuanya ditolak. Simpan keluarannya sebagai bukti E2-AC3.

### 4.5 Halaman konfirmasi sementara

- [ ] Halaman `/pesanan/[nomor]` yang untuk sementara menampilkan ringkasan kutipan; di Fase 5 diganti halaman status sungguhan.
- [ ] Pastikan tidak ada data pembeli yang bisa diakses lewat URL tebakan: halaman status nanti menuntut nomor order **dan** nomor HP (E3-US4).

### Gate Fase 4

| Gate | Bukti |
| --- | --- |
| E2-AC1 | Rekaman checkout tanpa akun; uji nomor HP valid dan tidak valid (08…, 62…, 07…, huruf) |
| E2-AC2 | Pengukuran waktu ongkir (p95) dari staging |
| E2-AC3 | Keluaran `tamper.ts`: semua request manipulasi ditolak |
| E2-AC4 | Rekaman stok kurang: pesan jelas dan keranjang diperbarui |
| E2-AC5 | Screenshot 360 px tiap langkah; laporan kontras dan aksesibilitas |
| Dokumentasi | `docs/phase-4.md` dan tag `v0.4.0` |

## Fase 5 — E3 Pembayaran Duitku dan siklus order

Fase 5 adalah fase paling berisiko: uang, stok, dan konsistensi status. Semua logika kritis harus atomik di database dan bisa dibuktikan lewat uji otomatis. Estimasi: 10-12 hari kerja.

**Prasyarat:** Gate Fase 4 dan hasil spike Duitku (Fase 0). Akun sandbox Duitku aktif dan URL staging publik untuk menerima callback.

**Output demo:** order sandbox dari keranjang sampai status Dibayar via QRIS, VA, dan e-wallet; order tidak dibayar kedaluwarsa otomatis dan stok kembali.

**Acceptance criteria dari PRD:** E3-AC1 sampai E3-AC9.

### 5.1 Model status order dan transisi

Alur sah: Menunggu Pembayaran → Dibayar → Diproses → Dikirim → Selesai; cabang Kedaluwarsa dan Dibatalkan; status tambahan "Perlu Ditinjau" untuk nominal tidak cocok (E3-AC5).

- [ ] Tulis `src/core/orders/status.ts` berisi peta transisi yang sah dan fungsi `canTransition(from, to)`; unit test untuk semua pasangan (termasuk yang ditolak).
- [ ] Buat tabel `order_events` (order\_id, dari, ke, pelaku, alasan, waktu) sebagai jejak audit; setiap perubahan status menulis satu baris.
- [ ] Tambahkan kolom `expires_at`, `paid_at`, `needs_review`, dan `stock_released` pada `orders`.
- [ ] Migrasi baru untuk perubahan di atas (jangan edit migrasi lama yang sudah dipakai).

### 5.2 Pembuatan order atomik dan penahanan stok (E3-AC1, E3-AC2)

- [ ] Tulis fungsi Postgres `create_order(...)` (RPC) yang dalam **satu transaksi**: mengunci baris varian (`select ... for update` atau `update ... where stock >= qty returning`), mengurangi stok, menyimpan `orders` + `order_items` dengan snapshot harga dan nama, dan mengisi `expires_at`. Bila satu item gagal, seluruh transaksi dibatalkan.
- [ ] Pastikan fungsi hanya bisa dipanggil lewat service role (cabut hak dari `anon` dan `authenticated`).
- [ ] Panggil fungsi itu dari `src/core/orders/create.ts` setelah kutipan server (Fase 4) lolos; gunakan kunci idempotensi dari klien (UUID per percobaan checkout) supaya klik ganda tidak membuat dua order.
- [ ] Skrip `scripts/qa/concurrency.ts`: 20 request bersamaan untuk 1 stok terakhir → tepat 1 sukses dan 19 gagal, stok tidak negatif (E3-AC2). Jalankan 5 kali berturut-turut dan simpan keluarannya.
- [ ] Uji kegagalan di tengah transaksi (misal item kedua habis) dan pastikan stok item pertama tidak berkurang.

### 5.3 Integrasi Create Invoice Duitku (E3-US1)

- [ ] Adapter `src/core/integrations/duitku/` berisi pembuat signature, `createInvoice`, `checkTransaction`, dan verifikasi callback; seluruhnya pure function yang bisa diuji dengan data contoh dari dokumentasi.
- [ ] Setelah order tersimpan, server membuat invoice (jumlah = total order, nomor order sebagai merchant order ID, data pembeli, item, URL callback, URL kembali, masa berlaku sesuai `expires_at`) dan menyimpan referensi di `payments`.
- [ ] Bila pembuatan invoice gagal, order tidak dibiarkan menggantung: tandai Dibatalkan dan lepas stok dalam transaksi yang sama dengan pencatatan error, lalu tampilkan pesan yang bisa dicoba ulang.
- [ ] Arahkan pembeli ke halaman pembayaran Duitku; sediakan tombol "Bayar sekarang" di halaman status pesanan bila pembeli menutup halaman itu sebelum membayar.
- [ ] Simpan metode bayar yang dipakai dan biaya bila dilaporkan callback.
- [ ] Seluruh kredensial hanya di server (E3-AC8); tambahkan uji build yang mencari string kunci di `.next/` dan gagal bila ketemu.

### 5.4 Callback: verifikasi, idempotensi, pencocokan nominal (E3-AC3, E3-AC4, E3-AC5)

- [ ] Route handler `POST /api/payments/duitku/callback` (tanpa cookie/sesi, jalur publik) yang membaca body sesuai format Duitku.
- [ ] Verifikasi signature dengan perbandingan waktu konstan. Signature salah → balas penolakan dan catat ke tabel `webhook_logs` (isi mentah, IP, alasan) tanpa mengubah order (E3-AC3).
- [ ] Cari order lewat merchant order ID; bila tidak ditemukan, catat dan balas sesuai kebutuhan Duitku tanpa membocorkan detail.
- [ ] Cocokkan jumlah callback dengan total order. Bila beda, set `needs_review = true` dan **jangan** ubah ke Dibayar (E3-AC5); catat di `order_events`.
- [ ] Idempotensi: fungsi Postgres `mark_order_paid(order_id, provider_reference, amount)` yang hanya mengubah status bila status saat ini Menunggu Pembayaran (atau Kedaluwarsa dengan kebijakan khusus, lihat 5.5), dengan unique constraint pada `payments.provider_reference`. Panggilan ulang tidak mengubah apa pun dan tidak memicu efek samping (E3-AC4).
- [ ] Pemicu efek samping (email, notifikasi) hanya dijalankan dari cabang "baru berubah" fungsi di atas.
- [ ] Skrip `scripts/qa/callback-replay.ts`: kirim callback valid yang sama 5 kali dan pastikan hanya satu perubahan status, satu baris `order_events` Dibayar, dan stok tidak berubah lagi.
- [ ] Uji callback dengan signature salah, nominal berbeda, order tidak dikenal, dan status gagal dari Duitku.

### 5.5 Polling status dan job terjadwal (E3-AC6, E3-AC7)

- [ ] Endpoint job `POST /api/jobs/reconcile` yang dilindungi token rahasia (header, dibandingkan waktu konstan): mengambil order Menunggu Pembayaran berusia > 10 menit dan belum kedaluwarsa, memanggil cek status Duitku, dan menerapkan `mark_order_paid` bila sudah lunas.
- [ ] Endpoint job `POST /api/jobs/expire` yang menandai order melewati `expires_at` sebagai Kedaluwarsa dan melepas stok dalam satu transaksi (fungsi Postgres `expire_order`), hanya sekali per order (`stock_released`).
- [ ] Atur cron cPanel tiap 10 menit yang memanggil kedua endpoint memakai `curl` dengan token; catat perintah persisnya di `docs/deploy.md`.
- [ ] Batasi jumlah order per eksekusi dan beri batas waktu eksekusi agar tidak menimpa eksekusi berikutnya (kunci lewat tabel `job_runs` atau advisory lock).
- [ ] Pertimbangan: bila pembeli membayar tepat setelah order kedaluwarsa, tentukan kebijakan (stok dikembalikan lagi bila masih ada, atau ditandai Perlu Ditinjau). Tulis keputusan di `docs/phase-5.md`.
- [ ] Uji E3-AC7: set masa berlaku 2 menit di staging, biarkan order tidak dibayar, dan verifikasi status serta stok kembali.

### 5.6 Halaman status pesanan (E3-US4)

- [ ] Rute `/pesanan` berisi form nomor order + nomor HP; rute `/pesanan/[nomor]` hanya menampilkan data setelah verifikasi pasangan (sesi singkat berbasis cookie httpOnly atau token bertanda tangan).
- [ ] Tampilkan status dengan linimasa, item, total, ongkir, metode bayar, tombol Bayar bila masih Menunggu Pembayaran, dan resi/tracking (komponen Fase 3) bila sudah Dikirim.
- [ ] Pesan error umum untuk kombinasi salah (jangan membedakan "nomor tidak ada" dan "HP salah") serta rate limit untuk mencegah tebakan.
- [ ] Halaman hasil pembayaran setelah kembali dari Duitku: tampilkan status terbaru dari database (bukan percaya parameter URL) dan lakukan cek status sekali bila callback belum tiba.

### 5.7 Uji alur penuh sandbox (E3-AC9)

- [ ] Jalankan 10 transaksi sandbox berurutan untuk masing-masing: QRIS, VA, dan e-wallet; catat hasil di tabel uji (nomor order, metode, hasil, catatan). Target akhir 30 dari 30 sukses ada di Fase 9.
- [ ] Uji skenario gagal: pembeli menutup halaman bayar, bayar setelah kedaluwarsa, bayar kurang/lebih (bila sandbox mendukung), dan Duitku lambat membalas.
- [ ] Uji tanpa callback (matikan endpoint sementara) dan buktikan job rekonsiliasi menyelamatkan order.

### Gate Fase 5

| Gate | Bukti |
| --- | --- |
| E3-AC1 | Uji RPC: kegagalan tengah transaksi membatalkan semuanya |
| E3-AC2 | Keluaran `concurrency.ts` 5 kali berjalan: 1 sukses, 19 gagal, stok ≥ 0 |
| E3-AC3 | Baris `webhook_logs` untuk callback bersignature salah |
| E3-AC4 | Keluaran `callback-replay.ts`: 5 callback, 1 perubahan |
| E3-AC5 | Order dengan nominal berbeda berstatus Perlu Ditinjau |
| E3-AC6 | Order tanpa callback berubah Dibayar lewat job dalam ≤ 10 menit |
| E3-AC7 | Order kedaluwarsa, stok kembali, job menolak panggilan tanpa token |
| E3-AC8 | Pencarian string kunci di build: nol temuan |
| E3-AC9 | Tabel uji sandbox (QRIS, VA, e-wallet) |
| Dokumentasi | `docs/phase-5.md` (keputusan kedaluwarsa-lalu-bayar) dan tag `v0.5.0` |

## Fase 6 — E5 Panel admin

Fase 6 membuat pemilik toko non-teknis bisa mengelola produk, order, resi, dan pengaturan sendiri di `/admin`. Estimasi: 9-11 hari kerja.

**Prasyarat:** Gate Fase 5 (order dan status), E1 untuk pratinjau produk, endpoint revalidasi dari Fase 2.

**Output demo:** pemilik toko login, menambah produk lengkap dengan 3 foto dan 3 ukuran, memproses order sampai Dikirim dengan resi, mengubah banner/info toko, dan mengekspor CSV.

**Acceptance criteria dari PRD:** E5-AC1 sampai E5-AC7, ditambah E4-US4 (pengaturan kurir) dan banner kuota E4-AC3.

### 6.1 Autentikasi dan otorisasi (E5-US1, E5-AC1)

- [ ] Login `/admin/login` dengan Supabase Auth (email + password); matikan pendaftaran publik di pengaturan Supabase Auth.
- [ ] Buat admin pertama lewat skrip seed (`scripts/create-admin.ts`) yang menulis ke `auth.users` melalui Admin API dan `admin_profiles`; password awal diberikan lewat input terminal, bukan disimpan di repo.
- [ ] Middleware yang memeriksa sesi pada semua rute `/admin/*` dan `/api/admin/*`, lalu memastikan pengguna ada di `admin_profiles`. Anon dan non-admin mendapat 401 atau 403.
- [ ] Rate limit 10 percobaan per menit per IP pada login; pesan galat generik.
- [ ] Fitur lupa password lewat email Supabase dan halaman ganti password.
- [ ] Semua operasi tulis admin memakai service role di server **setelah** pemeriksaan peran; jangan memanggil Supabase dengan service role dari komponen klien.
- [ ] Skrip `scripts/qa/admin-auth.ts`: panggil seluruh endpoint admin tanpa sesi dan dengan pengguna biasa, dan pastikan semuanya 401/403 (otomatis di CI bila memungkinkan, E5-AC1).

### 6.2 Kerangka admin dan navigasi

- [ ] Layout admin terpisah dari etalase: sidebar (Dashboard, Produk, Kategori, Pesanan, Pengaturan), header dengan nama pengguna dan tombol keluar, responsif untuk tablet dan mobile.
- [ ] Dashboard sederhana: jumlah order per status, order terbaru, stok rendah, dan banner peringatan kuota RajaOngkir ≥ 80% (data dari Fase 3).
- [ ] Istilah antarmuka dalam Bahasa Indonesia sehari-hari, tanpa jargon teknis; tooltip singkat untuk istilah yang perlu (misal SKU, varian).
- [ ] Komponen tabel data reusable: pencarian, filter, paginasi, dan keadaan kosong.

### 6.3 Manajemen produk (E5-US2, E5-AC2, E5-AC3, E5-AC6)

- [ ] Daftar produk dengan pencarian, filter kategori/status, dan aksi cepat (aktifkan/nonaktifkan, duplikat).
- [ ] Form produk: nama, slug otomatis (bisa diubah, dicek unik), kategori, deskripsi, bahan, perawatan, status aktif, dan tabel varian (warna, ukuran, SKU opsional, harga, stok, berat dalam gram).
- [ ] Aturan validasi: harga integer ≥ 0, stok ≥ 0, berat > 0, minimal satu varian, kombinasi warna+ukuran unik per produk.
- [ ] Pembuat varian cepat: pilih ukuran dan warna lalu otomatis membuat kombinasi, kemudian isi stok dan harga massal.
- [ ] Unggah foto: seret-lepas, urutkan, pilih foto utama, hapus, dan alt text (default dari nama produk, boleh diubah).
- [ ] Pemrosesan gambar (E5-AC2): tolak file > 10 MB; ubah ke WebP rasio 4:5 dengan crop interaktif; hasilkan utama 1200 px ≤ 150 KB dan thumbnail 400 px ≤ 60 KB. Lakukan di browser (canvas) sesuai keputusan mitigasi PRD; bila hasil Fase 0 membuktikan `sharp` jalan di server, boleh dipindah ke server.
- [ ] Unggah langsung ke Supabase Storage lewat URL bertanda tangan yang dibuat server setelah cek peran admin.
- [ ] Setelah simpan, panggil revalidasi halaman terkait (listing kategori, halaman produk, beranda, pencarian) dan ukur ≤ 5 detik (E5-AC3).
- [ ] Konfirmasi sebelum menghapus; gunakan penghapusan lunak (`is_active = false`/`deleted_at`) bila produk sudah pernah dipesan supaya riwayat order utuh.
- [ ] Manajemen kategori: tambah, ubah, urutkan, dan tonaktifkan.
- [ ] Uji kemudahan (E5-AC6): minta 3 orang non-teknis menambah 1 produk lengkap (3 foto, 3 ukuran) tanpa bantuan; catat waktu dan titik bingung, lalu perbaiki UI sebelum lanjut.

### 6.4 Manajemen order (E5-US3, E5-AC4)

- [ ] Daftar order dengan filter status, pencarian nomor order/nama/HP, rentang tanggal, dan penanda Perlu Ditinjau.
- [ ] Halaman detail order: item, alamat, kurir, total, riwayat pembayaran, `order_events`, dan catatan internal.
- [ ] Tombol perubahan status hanya menampilkan transisi sah dari `canTransition` (Fase 5); server menolak transisi lain dengan 409 dan pesan jelas. Uji: Menunggu Pembayaran → Dikirim ditolak.
- [ ] Aksi "Batalkan order" (hanya dari status tertentu) yang melepas stok lewat fungsi atomik yang sama dengan kedaluwarsa dan mencatat alasan.
- [ ] Penanganan order Perlu Ditinjau: admin melihat selisih nominal, lalu menyetujui (jadi Dibayar) atau menolak dengan catatan.
- [ ] Cetak ringkasan order/slip pengemasan sederhana (halaman cetak dengan CSS print).

### 6.5 Resi dan pengiriman (E5-US4, E5-AC5)

- [ ] Form di detail order: pilih kurir (dari daftar kurir aktif) dan isi nomor resi; validasi tidak kosong dan panjang wajar.
- [ ] Menyimpan resi membuat/mengubah baris `shipments` dan mengubah status ke Dikirim dalam satu transaksi; hanya boleh dari status Diproses atau Dibayar sesuai alur yang diputuskan (catat di `docs/phase-6.md`).
- [ ] Resi muncul di halaman status pembeli (Fase 5.6) dan tracking mengikuti cache 15 menit.
- [ ] Tombol "Tandai selesai" dan aturan otomatis opsional (selesai otomatis X hari setelah Dikirim) disimpan sebagai pengaturan, default mati.

### 6.6 Pengaturan toko (E5-US5, E4-US4)

- [ ] Form info toko: nama, logo, kontak WhatsApp, email, alamat, jam layanan, dan tautan media sosial; data dibaca etalase dari `store_settings` dan menimpa nilai default `store.config`.
- [ ] Alamat asal pengiriman: pilih tujuan lewat `DestinationPicker` dan simpan ID asal RajaOngkir serta nama; tanpa ini checkout menampilkan error konfigurasi.
- [ ] Pilihan kurir aktif (checkbox) dan batas kuota harian API.
- [ ] Editor tabel ukuran dalam cm (per kategori atau global) dengan pratinjau.
- [ ] Masa berlaku order tak dibayar (default 24 jam, rentang 1-72 jam) dan ambang stok rendah.
- [ ] Pengaturan banner beranda (gambar, judul, teks, tautan) agar E6-AC1 bisa dipenuhi.
- [ ] Tampilkan peringatan bila pengaturan penting belum lengkap (asal pengiriman, WhatsApp, kurir aktif).

### 6.7 Ekspor CSV (E5-US6, E5-AC7)

- [ ] Endpoint `GET /api/admin/orders/export?from=&to=&status=` yang mengalirkan CSV (UTF-8 dengan BOM agar Excel membaca benar).
- [ ] Kolom wajib: nomor order, tanggal, status, total, ongkir, resi; tambahan berguna: nama pembeli, kurir, metode bayar.
- [ ] Lindungi dari CSV injection (awali sel yang berawalan `=`, `+`, `-`, `@` dengan tanda kutip).
- [ ] Uji: jumlah baris CSV sama dengan jumlah order dalam rentang tanggal di database.

### 6.8 Audit dan ketahanan

- [ ] Catat aksi admin penting (ubah status, ubah resi, hapus produk) ke tabel `admin_audit_log`.
- [ ] Tangani konflik penyuntingan sederhana: bila produk diubah orang lain sejak dibuka, tampilkan peringatan sebelum menimpa (pakai `updated_at`).
- [ ] Uji akses di perangkat tablet dan mobile 360 px.

### Gate Fase 6

| Gate | Bukti |
| --- | --- |
| E5-AC1 | Keluaran `admin-auth.ts`: 401/403 untuk anon dan non-admin di semua endpoint admin |
| E5-AC2 | Uji unggah: 11 MB ditolak; hasil WebP 4:5 dengan ukuran file tercatat |
| E5-AC3 | Pengukuran waktu revalidasi (≤ 5 detik) |
| E5-AC4 | Uji transisi tidak sah ditolak |
| E5-AC5 | Rekaman simpan resi → status Dikirim → resi tampil di halaman pembeli |
| E5-AC6 | Lembar uji 3 orang non-teknis dengan waktu masing-masing ≤ 5 menit |
| E5-AC7 | CSV hasil ekspor dibandingkan dengan data database |
| Dokumentasi | `docs/phase-6.md` dan tag `v0.6.0`; dummy sudah bisa menjalankan order dari awal sampai Dikirim (milestone Tahap 1 PRD) |

## Fase 7 — E6 Konten, SEO, dan halaman trust

Fase 7 membuat dummy terlihat tepercaya dan enak dibagikan di WhatsApp dan Instagram, karena traffic datang dari sana. Estimasi: 6-8 hari kerja.

**Prasyarat:** Gate Fase 6 (banner dan info toko bisa diubah dari admin).

**Output demo:** beranda lengkap, halaman informasi, pratinjau tautan yang rapi di WhatsApp/Instagram, sitemap, dan analytics yang mencatat funnel.

**Acceptance criteria dari PRD:** E6-AC1 sampai E6-AC6.

### 7.1 Beranda (E6-US1, E6-AC1)

- [ ] Hero banner yang bisa diubah dari admin (gambar 2 ukuran: desktop dan mobile, judul, teks, tombol).
- [ ] Blok 3 kategori unggulan dengan foto besar dan tautan.
- [ ] Blok 8 produk terbaru (query berdasarkan `created_at`, hanya aktif dan punya stok).
- [ ] Strip kepercayaan tipis: cara bayar (QRIS, VA, e-wallet), pengiriman via kurir, dan kontak WhatsApp.
- [ ] ISR dengan revalidasi on-demand saat banner atau produk diubah.

### 7.2 Halaman informasi (E6-US1, E6-AC4)

- [ ] Halaman Tentang, Kontak, Cara Pesan, Kebijakan Retur, serta Syarat dan Privasi (berisi **placeholder** yang jelas; isi final di E8 setelah ada klien).
- [ ] Konten halaman diambil dari file Markdown/MDX di `src/theme/content/` supaya gampang diganti per klien tanpa menyentuh komponen.
- [ ] Footer memuat kontak, jam layanan, nama usaha, dan tautan ke halaman retur dan syarat.
- [ ] Halaman FAQ ringkas (ongkir, waktu proses, cara bayar, ukuran) dengan accordion.
- [ ] Halaman 404 dan 500 yang ramah dengan tautan kembali dan WhatsApp.

### 7.3 SEO dan berbagi tautan (E6-US2, E6-AC2, E6-AC3)

- [ ] `generateMetadata` per halaman: title, meta description, canonical, dan Open Graph (judul, gambar 1200×630 atau 4:5 yang valid, harga) serta Twitter card.
- [ ] Gambar OG untuk produk: gunakan foto utama; sediakan fallback gambar toko.
- [ ] `sitemap.xml` dan `robots.txt` otomatis dari data (produk aktif, kategori, halaman informasi). Halaman `/admin`, `/checkout`, `/pesanan` ditandai `noindex`.
- [ ] JSON-LD `Product` (nama, gambar, deskripsi, harga, mata uang IDR, ketersediaan) dan `BreadcrumbList` di halaman produk; validasi dengan Rich Results Test.
- [ ] Uji manual pratinjau tautan di WhatsApp dan Instagram untuk 3 produk berbeda; simpan screenshot (E6-AC2). Catatan: cache pratinjau WhatsApp bisa tertahan, gunakan URL baru atau alat debug untuk uji ulang.
- [ ] Pastikan URL produk stabil dan bersih (`/produk/<slug>`), dengan pengalihan 301 bila slug diubah.

### 7.4 Analytics (E6-AC5)

- [ ] Lapisan abstraksi `src/core/analytics` yang membaca ID dari `store.config` (GA4 atau alternatif); tanpa ID, tidak memuat skrip apa pun.
- [ ] Event: `view_item`, `add_to_cart`, `begin_checkout`, dan `purchase` dengan parameter item, nilai, dan mata uang.
- [ ] Event `purchase` dikirim dari halaman hasil pembayaran hanya sekali per order (cegah duplikat dengan penanda di database atau penyimpanan lokal) dan hanya bila status memang Dibayar.
- [ ] Banner persetujuan cookie sederhana bila analytics aktif (detail legal difinalkan di E8); pasang skrip dengan `next/script` strategi `afterInteractive` agar tidak merusak LCP.
- [ ] Verifikasi event di mode debug analytics untuk satu alur penuh.

### 7.5 Tombol WhatsApp mengambang (E6-AC6)

- [ ] Tombol mengambang di mobile yang berpindah posisi/menyusut di halaman produk dan checkout supaya tidak menutupi Tambah ke Keranjang dan Bayar.
- [ ] Uji di layar 360 px dan 390 px pada tiga halaman (produk, keranjang, checkout) dengan screenshot.
- [ ] Teks otomatis menyesuaikan konteks (umum, produk tertentu, atau masalah pesanan dengan nomor order).

### 7.6 Polesan visual

- [ ] Tinjauan desain keseluruhan di perangkat nyata: tipografi, jarak, konsistensi, dan keadaan kosong.
- [ ] Animasi mikro halus (hover, transisi drawer) tanpa menambah JavaScript berat.
- [ ] Favicon, ikon aplikasi, dan `theme-color`.

### Gate Fase 7

| Gate | Bukti |
| --- | --- |
| E6-AC1 | Beranda: hero, 3 kategori, 8 produk; banner diubah dari admin |
| E6-AC2 | Screenshot pratinjau WhatsApp dan Instagram untuk 3 produk |
| E6-AC3 | Sitemap, robots, dan hasil validasi JSON-LD |
| E6-AC4 | Footer dan halaman retur/syarat dengan placeholder |
| E6-AC5 | Rekaman debug 4 event dalam satu alur |
| E6-AC6 | Screenshot 360 px tiga halaman |
| Dokumentasi | `docs/phase-7.md` dan tag `v0.7.0` |

## Fase 8 — E7 Monitoring, backup, dan performa

Fase 8 memastikan masalah ketahuan sebelum klien yang melapor, data bisa dipulihkan, dan situs tetap cepat di Nimbus Go. Estimasi: 5-7 hari kerja.

**Prasyarat:** Gate Fase 7; domain di Cloudflare bila ingin menguji cache.

**Output demo:** alert masuk ke ponsel saat callback pembayaran error atau situs mati, restore backup berhasil diuji, uji beban lolos, dan runbook tertulis.

**Acceptance criteria dari PRD:** E7-AC1 sampai E7-AC6.

### 8.1 Logging dan notifikasi error (E7-US1, E7-AC1)

- [ ] Logger terstruktur (JSON: waktu, level, modul, order\_id, pesan, kode error) di `src/core/logger.ts`; jangan mencatat data pribadi lengkap atau kunci.
- [ ] Pilih satu kanal notifikasi gratis: bot Telegram, email lewat SMTP DomaiNesia, atau webhook ke Discord/Slack. Simpan token di environment.
- [ ] Kirim alert untuk: error di callback pembayaran, signature tidak valid berulang, kegagalan job rekonsiliasi/kedaluwarsa, order Perlu Ditinjau baru, dan kuota RajaOngkir ≥ 80%.
- [ ] Cegah banjir alert: kelompokkan per jenis dengan jeda minimal (misal 1 pesan per 10 menit per jenis).
- [ ] Pasang pelacak error (opsional, paket gratis) untuk error klien dan server; atur agar tidak mengirim data pembeli.
- [ ] Uji: sengaja memicu error pada callback dan job di staging, lalu pastikan alert tiba ≤ 1 menit.

### 8.2 Health check dan uptime (E7-US1, E7-AC2)

- [ ] Endpoint `GET /api/health` yang memeriksa koneksi Supabase (query ringan), versi aplikasi (tag/commit), dan mengembalikan 200 atau 503 tanpa membocorkan detail internal.
- [ ] Daftarkan ke layanan uptime gratis (interval 5 menit), alert saat gagal 2 kali berturut-turut ke kanal yang sama.
- [ ] Tambahkan pemantauan cron: job kedaluwarsa/rekonsiliasi menulis `job_runs`; alert bila tidak ada eksekusi > 30 menit.
- [ ] Matikan Supabase dummy atau blokir koneksi sementara untuk memastikan health check dan alert benar-benar bereaksi.
- [ ] Karena Supabase Free dipause setelah 7 hari tanpa aktivitas, tambahkan ping terjadwal dari layanan uptime ke endpoint yang menyentuh database supaya dummy tidak tertidur (catat bahwa ini hanya untuk fase dummy).

### 8.3 Backup dan restore (E7-US2, E7-AC3)

- [ ] Skrip `scripts/backup-db.sh` yang menjalankan `pg_dump` (atau `supabase db dump`) ke file terenkripsi dengan tanggal; simpan di lokasi terpisah dari server aplikasi (penyimpanan cloud pribadi).
- [ ] Jadwalkan dump manual mingguan untuk fase dummy dan tulis pengingat di kalender.
- [ ] Catat prosedur fase klien: backup harian Supabase Pro + dump bulanan ke penyimpanan terpisah (RPO ≤ 24 jam, RTO ≤ 4 jam).
- [ ] **Uji restore**: pulihkan dump ke project Supabase kosong, jalankan smoke test (login admin, buka produk, buat order sandbox), dan catat durasinya untuk memastikan RTO realistis.
- [ ] Cadangkan juga bucket Storage (daftar file + salinan) karena `pg_dump` tidak mencakup isi file.
- [ ] Dokumentasikan langkah pemulihan di runbook.

### 8.4 Cloudflare dan caching (E7-AC4)

- [ ] Arahkan DNS domain ke Cloudflare (proxy aktif) dan atur SSL mode Full (strict).
- [ ] Aturan cache: aset statis `/_next/static/*` dan gambar Supabase Storage di-cache lama; halaman HTML mengikuti header ISR (jangan cache `/admin`, `/api`, `/checkout`, `/pesanan`).
- [ ] Pastikan header `Cache-Control` dari aplikasi benar (immutable untuk aset berhash).
- [ ] Ukur rasio cache hit selama minimal 3 hari lalu 80% sebagai target awal (E7-AC4); catat angka nyata dan kalibrasi.
- [ ] Aktifkan aturan keamanan dasar Cloudflare (bot fight mode, rate limit tambahan di `/api/checkout` dan `/admin/login`) bila ada di paket gratis.

### 8.5 Performa dan uji beban (E7-US3, E7-AC5)

- [ ] Audit Lighthouse mobile (simulasi 4G) pada beranda, listing, produk, dan checkout; target LCP ≤ 2,5 detik dan skor ≥ 85. Perbaiki temuan: ukuran gambar, font, JavaScript berlebih, dan render-blocking.
- [ ] Analisis bundle (`@next/bundle-analyzer`) dan pastikan JavaScript halaman katalog ≤ 200 KB gzip.
- [ ] Uji beban ringan dengan k6 atau autocannon dari laptop: 50 pengguna bersamaan menelusuri katalog selama 5 menit (beranda → listing → produk). Ukur error rate (< 1%) dan p95 respons halaman ISR (< 800 ms).
- [ ] Pantau memori dan CPU di cPanel selama uji dan catat bila terkena batas proses CloudLinux (LVE) atau proses dimatikan.
- [ ] Bila gagal berulang: terapkan optimasi (lebih banyak halaman statis, kurangi query, perbesar cache) dan, jika tetap gagal, jalankan rencana cadangan dari Fase 0 (Cloud VPS) dan catat sebagai keputusan arsitektur.
- [ ] Uji lonjakan kecil terhadap `/api/shipping/rates` untuk memastikan cache melindungi kuota RajaOngkir.

### 8.6 Runbook (E7-AC6)

- [ ] Tulis `docs/runbook.md`: arsitektur singkat, daftar environment, cara deploy, **cara rollback ke build sebelumnya ≤ 10 menit** (simpan 3 build terakhir di server dan latih sekali dengan stopwatch), rotasi kunci API (Supabase, Duitku, RajaOngkir, token job, token revalidasi), dan penanganan insiden umum.
- [ ] Playbook insiden: callback gagal, order Perlu Ditinjau, kuota RajaOngkir habis, Supabase pause, dan situs lambat.
- [ ] Daftar kontak/akun penting dan lokasi menyimpan kunci (tanpa menuliskan kuncinya).

### Gate Fase 8

| Gate | Bukti |
| --- | --- |
| E7-AC1 | Screenshot alert di kanal dari error callback dan job yang sengaja dipicu |
| E7-AC2 | Konfigurasi uptime 5 menit; bukti alert setelah 2 kegagalan |
| E7-AC3 | Catatan restore berhasil ke project kosong beserta durasi |
| E7-AC4 | Angka cache hit Cloudflare setelah 3 hari |
| E7-AC5 | Keluaran uji beban (error rate dan p95) |
| E7-AC6 | Runbook dan catatan latihan rollback ≤ 10 menit |
| Dokumentasi | `docs/phase-8.md` dan tag `v0.8.0` |

## Fase 9 — Hardening, UAT, dan validasi dummy

Fase 9 menutup Tahap 2 PRD: membuktikan semua tujuan G1 sampai G5 dan metrik fase dummy (PRD bagian 12) dengan bukti, lalu menyatakan dummy siap ditunjukkan ke calon klien. Estimasi: 5-6 hari kerja.

**Prasyarat:** Gate Fase 8.

**Output:** laporan validasi dummy, template repo yang sudah dibersihkan, dan latihan setup toko baru dari template.

### 9.1 Pemeriksaan keamanan akhir

- [ ] `npm audit` tanpa temuan high atau critical; perbarui dependensi bila perlu.
- [ ] Pindai build klien: tidak ada string kunci Duitku, service role Supabase, API key RajaOngkir, token job, atau token revalidasi.
- [ ] Jalankan ulang `rls-check` dengan anon key pada database staging dan pastikan `orders`, `payments`, dan `shipments` tidak terbaca.
- [ ] Tinjau semua route handler: validasi input (zod), rate limit (10/menit/IP pada login dan checkout), pesan galat tidak membocorkan detail, dan metode HTTP dibatasi.
- [ ] Tambahkan header keamanan (Content-Security-Policy yang sesuai halaman pembayaran Duitku dan analytics, X-Frame-Options, Referrer-Policy, Permissions-Policy).
- [ ] Uji rotasi satu kunci (misal token job) mengikuti runbook.
- [ ] Tinjau cookie sesi admin: `httpOnly`, `secure`, `sameSite`.

### 9.2 Pengujian alur lengkap (G1, E3-AC9)

- [ ] Jalankan **30 dari 30 percobaan berturut-turut** checkout sandbox yang mencakup QRIS, VA, dan e-wallet (10 per metode). Bila ada satu gagal, perbaiki dan ulangi dari awal; catat tiap percobaan di tabel uji.
- [ ] Uji setelah sukses: admin memproses ke Dikirim dengan resi, dan pembeli melihat tracking di halaman status.
- [ ] Uji skenario tepi: stok habis saat checkout, ongkir gagal, callback terlambat, order kedaluwarsa, pembeli membayar dua kali, dan nomor HP salah di halaman status.
- [ ] Jalankan ulang `concurrency.ts`, `callback-replay.ts`, dan `tamper.ts` pada build akhir (G5).

### 9.3 Performa dan aksesibilitas (G3)

- [ ] Lighthouse mobile pada 4 halaman utama dengan hasil LCP ≤ 2,5 detik dan skor ≥ 85; simpan laporan.
- [ ] Audit WCAG 2.1 AA pada alur checkout (axe + uji keyboard manual + pembaca layar singkat) dan pastikan semua foto produk punya alt text.
- [ ] Uji kompatibilitas: Chrome, Safari, dan Samsung Internet dua versi terakhir; minimal satu Android kelas menengah ke bawah dengan koneksi 4G nyata.
- [ ] Uji layar 360 px pada semua halaman publik dan admin.

### 9.4 Uji pengguna admin dan pembeli

- [ ] Ulangi uji 3 orang non-teknis menambah produk (target semua ≤ 5 menit) pada build akhir.
- [ ] Uji pembeli dengan 3-5 orang: minta mereka membeli satu produk dari tautan WhatsApp sampai bayar sandbox, amati titik bingung, dan catat perbaikan.
- [ ] Perbaiki temuan berdampak tinggi; sisanya masuk daftar backlog.

### 9.5 Validasi biaya (G4)

- [ ] Hitung biaya gateway efektif dari data sandbox/tarif Duitku untuk 3 keranjang contoh (kecil, sedang, besar) per metode bayar; pastikan ≤ 2% dari nilai order rata-rata atau catat kondisi di mana tidak terpenuhi (misal VA nominal kecil).
- [ ] Verifikasi ulang tarif Duitku, aturan QRIS, dan harga Supabase Pro/RajaOngkir Pro ke halaman resmi dan catat tanggalnya sebelum dipakai dalam penawaran (PRD bagian 15 meminta ini).
- [ ] Perbarui kalkulasi titik impas di PRD dengan angka yang sudah diverifikasi.

### 9.6 Latihan setup toko baru dari template (G2, metrik dummy)

Tujuannya membuktikan target setup ≤ 1 hari sampai staging live. Lakukan 2 kali dengan stopwatch.

- [ ] Rapikan repo: hapus kode eksperimen, pastikan `README.md` menjelaskan langkah clone, `.env.example` lengkap, dan `CUSTOMIZATIONS.md` template ada.
- [ ] Tandai repo sebagai template, buat tag `v1.0.0-template`.
- [ ] Latihan 1: buat repo dari template, project Supabase baru, jalankan semua migrasi + seed minimal, isi environment dengan kredensial sandbox, ubah tema (nama, logo, warna, font), deploy ke subdomain staging kedua. Catat waktu tiap langkah.
- [ ] Latihan 2: ulangi dengan perbaikan dari latihan 1 dan catat waktu total (target ≤ 1 hari).
- [ ] Tulis `docs/new-client-checklist.md` dari hasil latihan (lihat versi awal di Lampiran).
- [ ] Uji sinkronisasi: tambahkan remote `upstream`, rilis perbaikan kecil di template (`v1.0.1`), lalu merge ke repo latihan; catat bila ada konflik dan perbaiki struktur `core`/`custom` bila perlu.

### 9.7 Paket demo

- [ ] Pastikan label demo terlihat dan dummy tidak menerima order nyata (kredensial sandbox saja).
- [ ] Siapkan skrip demo 10 menit: cerita masalah admin 10%, tampilkan toko di HP, beli produk, bayar QRIS sandbox, lalu tunjukkan admin menerima order dan mengisi resi.
- [ ] Siapkan satu halaman perbandingan biaya (marketplace vs website) untuk calon klien dengan angka terverifikasi dan asumsi yang jelas.
- [ ] Aktifkan kembali Supabase Free sehari sebelum demo dan uji penuh (risiko pause 7 hari).

### Gate Fase 9 (gerbang penutup Tahap 2)

| Tujuan PRD | Bukti |
| --- | --- |
| G1 Checkout end-to-end | Tabel 30/30 percobaan sukses |
| G2 Onboarding ≤ 5 hari kerja | Catatan latihan setup (≤ 1 hari sampai staging, 2 kali) |
| G3 Performa mobile | Laporan Lighthouse LCP ≤ 2,5 detik, skor ≥ 85 |
| G4 Biaya gateway ≤ 2% | Tabel hitungan biaya per metode dan nominal |
| G5 Tidak ada oversell/order ganda | Keluaran konkurensi dan replay callback pada build akhir |
| Admin mudah dipakai | 3 dari 3 orang non-teknis ≤ 5 menit |
| Dokumentasi | `docs/phase-9.md`, laporan validasi, dan tag `v1.0.0-template` |

Setelah gate ini lolos, dummy siap didemokan. Langkah berikutnya adalah Tahap 3 PRD (E8 dan seterusnya), yang dimulai begitu klien pertama ada; E8 (legal dan verifikasi merchant) adalah gate wajib sebelum go-live klien.

## Lampiran

Lampiran berisi draf teknis yang dipakai lintas fase. Semuanya draf awal; sesuaikan saat implementasi dan catat perubahannya di `docs/phase-<n>.md`.

### A. Draf skema database

Harga dan nominal selalu integer rupiah. Semua tabel punya `id` (uuid), `created_at`, dan `updated_at` kecuali disebut lain. Tabel dengan tanda (F5), (F6), atau (F3) ditambahkan di fase itu, bukan di Fase 1.

| Tabel | Kolom utama | Catatan |
| --- | --- | --- |
| `categories` | name, slug (unik), description, image\_url, sort\_order, is\_active | Dipakai listing dan beranda |
| `products` | category\_id, name, slug (unik), description, material, care, is\_active, search\_vector | Indeks pada slug dan (category\_id, is\_active) |
| `product_variants` | product\_id, color, size, sku, price, stock, weight\_grams | `check (stock >= 0)`, `check (price >= 0)`, unik (product\_id, color, size) |
| `product_images` | product\_id, url, thumb\_url, alt, sort\_order, is\_primary | Foto utama 1200 px dan thumbnail 400 px |
| `orders` | order\_number (unik), status, customer\_name, phone, email, address, destination\_id, destination\_label, courier, courier\_service, subtotal, shipping\_cost, total, note, idempotency\_key (unik), expires\_at, paid\_at, needs\_review, stock\_released | Tanpa kebijakan RLS untuk anon |
| `order_items` | order\_id, variant\_id, product\_name, variant\_label, unit\_price, quantity | Snapshot nama dan harga saat order dibuat |
| `payments` | order\_id, provider, provider\_reference (unik), method, amount, status, raw\_response, paid\_at | Unik pada `provider_reference` mencegah pembayaran ganda |
| `shipments` | order\_id, courier, tracking\_number, shipped\_at, last\_tracking\_status | Resi diisi admin |
| `store_settings` | satu baris: name, logo\_url, whatsapp, email, address, hours, origin\_destination\_id, origin\_label, active\_couriers, order\_expiry\_hours, low\_stock\_threshold, api\_daily\_limit, size\_chart (jsonb), banner (jsonb) | Pisahkan field rahasia dari field publik |
| `admin_profiles` | user\_id (fk auth.users), display\_name | Penentu akses admin |
| `order_events` (F5) | order\_id, from\_status, to\_status, actor, reason | Jejak audit status |
| `webhook_logs` (F5) | provider, headers, body, ip, valid\_signature, result | Callback tidak valid dicatat di sini |
| `job_runs` (F5) | job\_name, started\_at, finished\_at, result | Kunci eksekusi dan pemantauan cron |
| `api_usage` (F3) | date, provider, endpoint, calls, failures | Dasar peringatan kuota 80% |
| `shipping_cache` (F3, opsional) | cache\_key (unik), payload, expires\_at | Bila tidak memakai cache memori |
| `admin_audit_log` (F6) | user\_id, action, entity, entity\_id, details | Aksi admin penting |

### B. Variabel environment

Semua variabel server tidak boleh diawali `NEXT_PUBLIC_`. Isi nilai hanya di `.env.local` dan environment cPanel; `.env.example` hanya berisi nama dan contoh kosong.

| Variabel | Dipakai di | Visibilitas |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Klien baca etalase | Publik |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Klien baca etalase (dibatasi RLS) | Publik |
| `SUPABASE_SERVICE_ROLE_KEY` | Operasi server (order, admin) | Rahasia, server saja |
| `DUITKU_MERCHANT_CODE`, `DUITKU_API_KEY`, `DUITKU_ENV` | Adapter Duitku (sandbox/produksi) | Rahasia, server saja |
| `RAJAONGKIR_API_KEY`, `RAJAONGKIR_BASE_URL` | Adapter RajaOngkir | Rahasia, server saja |
| `SITE_URL` | Callback, OG, sitemap | Publik |
| `JOB_SECRET_TOKEN` | Endpoint cron | Rahasia, server saja |
| `REVALIDATE_SECRET_TOKEN` | `/api/revalidate` | Rahasia, server saja |
| `ALERT_WEBHOOK_URL` atau `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | Notifikasi error | Rahasia, server saja |
| `NEXT_PUBLIC_ANALYTICS_ID` | Analytics | Publik |

### C. Pohon folder yang disarankan

```markdown
src/
  app/                # rute (etalase, checkout, pesanan, admin, api)
  components/ui/      # komponen dasar
  core/               # jangan diubah per klien
    data/             # akses data produk/order
    orders/           # pricing, status, create, checkout
    integrations/
      duitku/
      rajaongkir/
    supabase/         # server.ts, public.ts
    analytics/
    logger.ts
    env.ts
  theme/              # token, store.config, konten MDX (diubah per klien)
  custom/             # override khusus klien
supabase/
  migrations/         # satu-satunya jalur perubahan skema
  seed.sql
scripts/
  qa/                 # rls-check, concurrency, callback-replay, tamper, admin-auth
  spike/              # skrip eksperimen Fase 0
docs/                 # phase-n.md, spike, deploy, runbook
```

### D. Checklist awal untuk klien baru (dipersempit di Fase 9, dilengkapi di E8)

- [ ] Buat repo dari template dan tambahkan remote `upstream`.
- [ ] Buat project Supabase baru; jalankan semua migrasi; buat admin pertama.
- [ ] Isi environment (Supabase, Duitku sandbox klien, RajaOngkir 1 key per toko, domain).
- [ ] Atur `src/theme` (nama, logo, warna, font, kontak) dan konten halaman informasi.
- [ ] Unggah produk klien dan foto asli (panduan foto singkat diberikan ke klien).
- [ ] Atur info toko di admin: asal pengiriman, kurir aktif, tabel ukuran, WhatsApp.
- [ ] Deploy ke Nimbus Go; atur cron kedaluwarsa dan rekonsiliasi.
- [ ] Uji transaksi sandbox end-to-end; setelah verifikasi merchant Duitku selesai, ganti ke kredensial produksi dan uji 1 transaksi nyata nominal kecil.
- [ ] Pasang Cloudflare, uptime monitor, dan alert; lakukan uji restore bila belum.
- [ ] Pastikan E8 lengkap (kebijakan privasi, syarat, kontrak, verifikasi merchant) sebelum go-live.

### E. Pasangan risiko dan fase

Risiko dari PRD bagian 13 yang paling relevan dipantau di fase tertentu.

| Fase | Risiko yang harus dijaga | Tindakan cepat |
| --- | --- | --- |
| 0 | Nimbus Go tidak stabil untuk Next.js; tracking tidak tersedia di Starter | Putuskan cadangan hosting dan fallback tracking sebelum Fase 1 |
| 1 | Skema tidak bisa direproduksi; kebocoran data lewat RLS | Uji migrasi pada project kosong; jalankan `rls-check` di setiap perubahan skema |
| 2 | Foto AI terlihat tidak realistis; performa gambar | Label demo, kompres WebP, uji Lighthouse sejak awal |
| 3 | Kuota 100 hit/hari habis | Cache 30 menit, pencatatan pemakaian, fallback WhatsApp |
| 4 | Manipulasi harga dan ongkir di request | Hitung ulang di server, skrip `tamper.ts` |
| 5 | Oversell, callback ganda, nominal tidak cocok | RPC atomik, idempotensi, polling status, uji konkurensi |
| 6 | Pemilik toko kesulitan memakai admin; pustaka gambar server tidak jalan | Uji 3 pengguna, proses gambar di browser |
| 7 | Pratinjau WhatsApp/IG rusak; analytics menggandakan purchase | Uji manual, penanda sekali kirim |
| 8 | Proses dimatikan batas CloudLinux; backup tidak pernah diuji | Uji beban dan latihan restore |
| 9 | Menyatakan siap padahal belum terbukti | Gate dengan bukti tertulis untuk G1-G5 |
