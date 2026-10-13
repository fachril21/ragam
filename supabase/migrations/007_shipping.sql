-- 007: shipping cache, API usage counters, and rate limiting (Phase 3 / E4).
-- Server-only: RLS is on with no policies and anon/authenticated hold no privileges, so only the
-- service role (which bypasses RLS) can read or write these tables.

create table public.shipping_cache (
  key text primary key,
  kind text not null constraint shipping_cache_kind_check check (kind in ('destinations', 'rates', 'tracking')),
  payload jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index shipping_cache_expires_idx on public.shipping_cache (expires_at);

create table public.api_usage (
  day date not null,
  provider text not null,
  endpoint text not null,
  calls integer not null default 0 constraint api_usage_calls_check check (calls >= 0),
  failures integer not null default 0 constraint api_usage_failures_check check (failures >= 0),
  updated_at timestamptz not null default now(),
  primary key (day, provider, endpoint)
);

create table public.rate_limits (
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket)
);

alter table public.shipping_cache enable row level security;
alter table public.api_usage enable row level security;
alter table public.rate_limits enable row level security;
revoke all on public.shipping_cache, public.api_usage, public.rate_limits from anon, authenticated;

-- Records one upstream call and returns the provider's total calls for today (Asia/Jakarta day).
create function public.increment_api_usage(p_provider text, p_endpoint text, p_failed boolean default false)
returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_day date := (now() at time zone 'Asia/Jakarta')::date;
begin
  insert into public.api_usage as u (day, provider, endpoint, calls, failures)
  values (v_day, p_provider, p_endpoint, 1, case when p_failed then 1 else 0 end)
  on conflict (day, provider, endpoint) do update
    set calls = u.calls + 1,
        failures = u.failures + case when p_failed then 1 else 0 end,
        updated_at = now();
  return (select coalesce(sum(calls), 0) from public.api_usage where day = v_day and provider = p_provider);
end;
$$;

-- Fixed-window limiter. Returns true when the request is allowed. Atomic per bucket.
create function public.consume_rate_limit(p_bucket text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_hits integer;
begin
  if p_max < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit parameters';
  end if;
  insert into public.rate_limits as r (bucket, window_start, hits)
  values (p_bucket, now(), 1)
  on conflict (bucket) do update
    set window_start = case when r.window_start <= now() - make_interval(secs => p_window_seconds)
                            then now() else r.window_start end,
        hits = case when r.window_start <= now() - make_interval(secs => p_window_seconds)
                    then 1 else r.hits + 1 end
  returning hits into v_hits;
  return v_hits <= p_max;
end;
$$;

revoke all on function public.increment_api_usage(text, text, boolean) from public, anon, authenticated;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.increment_api_usage(text, text, boolean) to service_role;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;

-- Manual post-run checklist:
--   1. select count(*) from public.shipping_cache;  -- as service role: works; with anon key: permission denied
--   2. npm run qa:rls                               -- must still print "RLS check PASSED"
--   3. update public.store_settings set origin_destination_id = '<id>', origin_label = '<label>',
--        active_couriers = '{jne,sicepat,jnt,pos}';  -- origin must be set before /api/shipping/rates works
