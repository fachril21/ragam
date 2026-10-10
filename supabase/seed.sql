-- Demo seed: 3 categories, 22 products, 3+ sizes each, some with 2-3 colors.
-- Safe to run once on an empty database (supabase db reset applies it automatically).

insert into public.categories (name, slug, description, sort_order) values
  ('Kaos', 'kaos', 'Kaos harian berbahan nyaman', 1),
  ('Kerudung', 'kerudung', 'Kerudung dan hijab segi empat serta pashmina', 2),
  ('Outer', 'outer', 'Kemeja, cardigan, dan jaket ringan', 3);

create temporary table seed_products (
  category_slug text,
  slug text,
  name text,
  description text,
  material text,
  price integer,
  colors text[],
  sizes text[],
  weight_grams integer
) on commit drop;

insert into seed_products values
  ('kaos', 'kaos-basic-katun', 'Kaos Basic Katun', 'Kaos polos potongan reguler, jatuh rapi dan tidak menerawang.', 'Katun combed 30s', 89000, '{putih,hitam,abu}', '{S,M,L,XL}', 200),
  ('kaos', 'kaos-oversize-heavy', 'Kaos Oversize Heavy', 'Siluet longgar dengan bahan tebal berstruktur.', 'Katun 24s', 129000, '{hitam,krem}', '{M,L,XL}', 280),
  ('kaos', 'kaos-polo-pique', 'Kaos Polo Piqué', 'Polo klasik dengan kerah rapi untuk hari kerja santai.', 'Katun piqué', 149000, '{navy,putih}', '{S,M,L,XL}', 260),
  ('kaos', 'kaos-lengan-panjang', 'Kaos Lengan Panjang', 'Lengan panjang ringan, nyaman untuk ruangan ber-AC.', 'Katun combed 30s', 109000, '{hitam,abu,olive}', '{S,M,L}', 240),
  ('kaos', 'kaos-raglan-sport', 'Kaos Raglan Sport', 'Bahan cepat kering untuk aktivitas ringan.', 'Poliester dry-fit', 99000, '{hitam,biru}', '{S,M,L,XL}', 190),
  ('kaos', 'kaos-henley', 'Kaos Henley', 'Kancing tiga di leher, tampil lebih rapi dari kaos biasa.', 'Katun slub', 139000, '{krem,olive}', '{S,M,L}', 250),
  ('kaos', 'kaos-crop-rib', 'Kaos Crop Rib', 'Potongan crop berbahan rib yang lentur.', 'Katun rib spandeks', 79000, '{putih,hitam,coklat}', '{S,M,L}', 150),
  ('kaos', 'kaos-grafis-ragam', 'Kaos Grafis Ragam', 'Sablon ringan bergaya motif nusantara.', 'Katun combed 30s', 119000, '{putih,hitam}', '{S,M,L,XL}', 210),
  ('kerudung', 'kerudung-segi-empat-voal', 'Kerudung Segi Empat Voal', 'Voal ultrafine, mudah dibentuk dan tidak licin.', 'Voal ultrafine', 69000, '{hitam,krem,sage,dusty-pink}', '{110,115,120}', 90),
  ('kerudung', 'kerudung-pashmina-plisket', 'Pashmina Plisket', 'Plisket halus yang tetap rapi seharian.', 'Ceruti baby doll', 85000, '{hitam,coklat,navy}', '{175,180,185}', 110),
  ('kerudung', 'kerudung-instan-jersey', 'Kerudung Instan Jersey', 'Instan tanpa jarum, bahan jersey adem.', 'Jersey premium', 79000, '{hitam,abu,mocca}', '{S,M,L}', 120),
  ('kerudung', 'kerudung-bergo-diamond', 'Bergo Diamond', 'Bergo praktis dengan bahan diamond crepe.', 'Diamond crepe', 59000, '{hitam,navy}', '{S,M,L}', 100),
  ('kerudung', 'kerudung-paris-premium', 'Paris Premium', 'Katun paris klasik, jatuh dan mudah dirapikan.', 'Katun paris', 55000, '{putih,krem,abu}', '{110,115,120}', 85),
  ('kerudung', 'kerudung-motif-batik', 'Kerudung Motif Batik', 'Motif batik cetak dengan warna tahan lama.', 'Voal print', 75000, '{coklat,biru}', '{110,115,120}', 90),
  ('kerudung', 'kerudung-satin-silk', 'Satin Silk Scarf', 'Satin mengkilap untuk acara istimewa.', 'Satin silk', 99000, '{champagne,hitam}', '{110,115,120}', 95),
  ('outer', 'outer-kemeja-linen', 'Kemeja Linen', 'Kemeja linen ringan, cocok untuk cuaca tropis.', 'Linen blend', 189000, '{putih,biru,olive}', '{S,M,L,XL}', 300),
  ('outer', 'outer-cardigan-rajut', 'Cardigan Rajut', 'Rajut tipis dengan kancing depan.', 'Rajut akrilik', 169000, '{krem,hitam}', '{S,M,L}', 320),
  ('outer', 'outer-jaket-coach', 'Jaket Coach', 'Jaket coach tahan angin dengan kancing snap.', 'Parasut', 229000, '{hitam,navy}', '{M,L,XL}', 380),
  ('outer', 'outer-blazer-santai', 'Blazer Santai', 'Blazer tanpa lapisan, nyaman untuk kantor santai.', 'Katun twill', 249000, '{hitam,abu,coklat}', '{S,M,L,XL}', 450),
  ('outer', 'outer-hoodie-zip', 'Hoodie Zip', 'Hoodie dengan resleting dan kantong depan.', 'Fleece katun', 219000, '{abu,hitam}', '{S,M,L,XL}', 480),
  ('outer', 'outer-vest-quilted', 'Vest Quilted', 'Rompi quilted ringan untuk layering.', 'Poliester quilted', 179000, '{navy,olive}', '{S,M,L}', 330),
  ('outer', 'outer-tunik-panjang', 'Tunik Panjang', 'Tunik panjang berpotongan lurus, nyaman dan sopan.', 'Rayon twill', 159000, '{sage,dusty-pink,krem}', '{S,M,L,XL}', 280),
  ('outer', 'outer-kemeja-flanel', 'Kemeja Flanel', 'Flanel kotak-kotak hangat dan lembut.', 'Flanel katun', 175000, '{merah,biru}', '{M,L,XL}', 340);

insert into public.products (category_id, name, slug, description, material, care)
select c.id, s.name, s.slug, s.description, s.material,
       'Cuci dengan air dingin, jangan gunakan pemutih, setrika suhu rendah.'
from seed_products s
join public.categories c on c.slug = s.category_slug;

insert into public.product_variants (product_id, color, size, price, stock, weight_grams)
select p.id, color, size, s.price,
       case when abs(hashtext(s.slug || color || size)) % 7 = 0 then 0
            else 3 + abs(hashtext(size || color || s.slug)) % 20 end,
       s.weight_grams
from seed_products s
join public.products p on p.slug = s.slug
cross join lateral unnest(s.colors) as color
cross join lateral unnest(s.sizes) as size;

insert into public.store_settings (
  name, whatsapp, email, address, hours, size_chart, banner, active_couriers
) values (
  'Ragam',
  '6281234567890',
  'halo@ragam.example',
  'Jl. Contoh No. 1, Jakarta',
  'Senin–Sabtu, 09.00–17.00 WIB',
  '[
    {"category": "kaos", "unit": "cm", "columns": ["Lebar dada", "Panjang badan"], "rows": [
      {"size": "S", "values": [49, 68]}, {"size": "M", "values": [52, 70]},
      {"size": "L", "values": [55, 72]}, {"size": "XL", "values": [58, 74]}]},
    {"category": "outer", "unit": "cm", "columns": ["Lebar dada", "Panjang badan"], "rows": [
      {"size": "S", "values": [52, 68]}, {"size": "M", "values": [55, 70]},
      {"size": "L", "values": [58, 72]}, {"size": "XL", "values": [61, 74]}]},
    {"category": "kerudung", "unit": "cm", "columns": ["Sisi", "Keterangan"], "rows": [
      {"size": "110", "values": [110, 0]}, {"size": "115", "values": [115, 0]}, {"size": "120", "values": [120, 0]}]}
  ]'::jsonb,
  '{"title": "Koleksi Terbaru", "text": "Busana sehari-hari yang nyaman", "href": "/produk"}'::jsonb,
  '{jne,jnt,sicepat,pos}'
);
