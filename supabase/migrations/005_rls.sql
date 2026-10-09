-- 005: row level security and grants.
-- Sensitive tables (orders, order_items, payments, shipments) get RLS with NO policy for
-- anon/authenticated: only the server (service role, which bypasses RLS) can touch them.

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_profiles where user_id = auth.uid())
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.shipments enable row level security;
alter table public.store_settings enable row level security;
alter table public.admin_profiles enable row level security;

-- Defense in depth: no table privileges at all for sensitive tables.
revoke all on public.orders, public.order_items, public.payments, public.shipments
  from anon, authenticated;

-- Catalog: anon may only read.
revoke insert, update, delete, truncate on
  public.categories, public.products, public.product_variants, public.product_images
  from anon;

create policy categories_public_read on public.categories
  for select to anon, authenticated using (is_active or public.is_admin());
create policy products_public_read on public.products
  for select to anon, authenticated using (is_active or public.is_admin());
create policy variants_public_read on public.product_variants
  for select to anon, authenticated using (
    public.is_admin()
    or exists (select 1 from public.products p where p.id = product_id and p.is_active)
  );
create policy images_public_read on public.product_images
  for select to anon, authenticated using (
    public.is_admin()
    or exists (select 1 from public.products p where p.id = product_id and p.is_active)
  );

create policy categories_admin_write on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy products_admin_write on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy variants_admin_write on public.product_variants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy images_admin_write on public.product_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Store settings: anon sees only public columns; admins manage everything.
revoke all on public.store_settings from anon;
grant select (name, logo_url, whatsapp, email, address, hours, size_chart, banner, low_stock_threshold)
  on public.store_settings to anon;

create policy store_settings_public_read on public.store_settings
  for select to anon, authenticated using (true);
create policy store_settings_admin_write on public.store_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Admin profiles: a user may read only their own row; writes via service role only.
revoke all on public.admin_profiles from anon;
revoke insert, update, delete on public.admin_profiles from authenticated;
create policy admin_profiles_self_read on public.admin_profiles
  for select to authenticated using (user_id = auth.uid());
