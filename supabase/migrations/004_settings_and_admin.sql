-- 004: single-row store settings and admin allow-list.

create table public.store_settings (
  id boolean primary key default true constraint store_settings_single_row check (id),
  -- Public columns (readable by anon, see 005).
  name text not null,
  logo_url text,
  whatsapp text,
  email text,
  address text,
  hours text,
  size_chart jsonb not null default '[]'::jsonb,
  banner jsonb not null default '{}'::jsonb,
  low_stock_threshold integer not null default 3 constraint store_settings_low_stock_check check (low_stock_threshold >= 0),
  -- Internal columns (admin and service role only).
  origin_destination_id text,
  origin_label text,
  active_couriers text[] not null default '{}',
  order_expiry_hours integer not null default 24 constraint store_settings_expiry_check check (order_expiry_hours between 1 and 72),
  api_daily_limit integer not null default 100 constraint store_settings_api_limit_check check (api_daily_limit > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger store_settings_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();
create trigger admin_profiles_updated_at before update on public.admin_profiles
  for each row execute function public.set_updated_at();
