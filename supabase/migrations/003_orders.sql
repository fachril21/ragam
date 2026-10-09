-- 003: orders, items, payments, shipments.
-- Phase 5 adds idempotency/expiry/review columns in a new migration.

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  status public.order_status not null default 'pending_payment',
  customer_name text not null,
  phone text not null,
  email text not null,
  address text not null,
  destination_id text,
  destination_label text,
  courier text,
  courier_service text,
  subtotal integer not null constraint orders_subtotal_check check (subtotal >= 0),
  shipping_cost integer not null constraint orders_shipping_cost_check check (shipping_cost >= 0),
  total integer not null constraint orders_total_check check (total >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_status_created_idx on public.orders (status, created_at);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  variant_label text not null,
  unit_price integer not null constraint order_items_unit_price_check check (unit_price >= 0),
  quantity integer not null constraint order_items_quantity_check check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index order_items_order_idx on public.order_items (order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null,
  provider_reference text not null unique,
  method text,
  amount integer not null constraint payments_amount_check check (amount >= 0),
  status public.payment_status not null default 'pending',
  raw_response jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_order_idx on public.payments (order_id);

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  courier text not null,
  tracking_number text,
  status public.shipment_status not null default 'pending',
  shipped_at timestamptz,
  last_tracking_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shipments_order_idx on public.shipments (order_id);

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger order_items_updated_at before update on public.order_items
  for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger shipments_updated_at before update on public.shipments
  for each row execute function public.set_updated_at();
