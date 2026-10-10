-- 001: enums and shared utilities.
-- All schema changes go through migration files, never the Supabase dashboard.

create extension if not exists pg_trgm with schema extensions;

create type public.order_status as enum (
  'pending_payment',
  'paid',
  'processing',
  'shipped',
  'completed',
  'expired',
  'cancelled'
);

create type public.payment_status as enum ('pending', 'paid', 'failed', 'expired', 'refunded');

create type public.shipment_status as enum ('pending', 'shipped', 'delivered', 'returned');

create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
