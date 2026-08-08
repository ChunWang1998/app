-- 答禮 — 問卷配對平台（第一刀）
-- 在 Supabase Dashboard → SQL Editor 貼上執行一次
-- 需要：Auth（Email OTP／Magic Link）已開啟

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references auth.users (id),
  title text not null,
  category text not null
    check (category in ('academic', 'product', 'ux', 'course', 'other')),
  estimated_minutes int not null check (estimated_minutes > 0 and estimated_minutes <= 180),
  open_days int not null default 14 check (open_days > 0 and open_days <= 90),
  quota int not null check (quota > 0 and quota <= 5000),
  eligibility_note text not null default '',
  survey_url text not null,
  -- query param name used to prefill completion code on external form
  token_query_param text not null default 'completion_code',
  reward_type text not null check (reward_type in ('starbucks', 'convenience')),
  reward_description text not null,
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'approved', 'closed')),
  opens_at timestamptz not null default now(),
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_status_opens_idx
  on public.listings (status, opens_at desc);

create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  -- plaintext for MVP; never exposed via RLS SELECT — only via redeem RPC
  code text not null,
  status text not null default 'locked'
    check (status in ('locked', 'issued', 'returned')),
  issued_to uuid references auth.users (id),
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  unique (listing_id, code)
);

create index if not exists vouchers_listing_status_idx
  on public.vouchers (listing_id, status);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  token text not null unique,
  status text not null default 'started'
    check (status in ('started', 'redeemed', 'expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  redeem_fail_count int not null default 0
);

create index if not exists attempts_user_listing_idx
  on public.attempts (user_id, listing_id);

create index if not exists attempts_token_idx
  on public.attempts (token);

create table if not exists public.redemptions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id),
  user_id uuid not null references auth.users (id),
  attempt_id uuid not null references public.attempts (id),
  voucher_id uuid not null references public.vouchers (id),
  created_at timestamptz not null default now(),
  unique (listing_id, user_id),
  unique (attempt_id),
  unique (voucher_id)
);

create index if not exists redemptions_user_created_idx
  on public.redemptions (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_listings_updated_at on public.listings;
create trigger trg_listings_updated_at
before update on public.listings
for each row execute function public.set_updated_at();

-- Readable one-time token: XXXX-XXXX
create or replace function public.generate_attempt_token()
returns text
language plpgsql
as $$
declare
  alphabet text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  raw text := '';
  i int;
  b bytea;
begin
  b := gen_random_bytes(8);
  for i in 0..7 loop
    raw := raw || substr(alphabet, (get_byte(b, i) % length(alphabet)) + 1, 1);
  end loop;
  return substr(raw, 1, 4) || '-' || substr(raw, 5, 4);
end;
$$;

create or replace function public.append_token_to_survey_url(
  p_url text,
  p_param text,
  p_token text
)
returns text
language sql
immutable
as $$
  select case
    when position('?' in p_url) > 0 then p_url || '&' || p_param || '=' || p_token
    else p_url || '?' || p_param || '=' || p_token
  end;
$$;

-- Public listing card (no secrets)
create or replace view public.listing_cards
with (security_invoker = true)
as
select
  l.id,
  l.title,
  l.category,
  l.estimated_minutes,
  l.quota,
  l.eligibility_note,
  l.reward_type,
  l.reward_description,
  l.status,
  l.opens_at,
  l.closes_at,
  l.publisher_id,
  (
    select count(*)::int
    from public.redemptions r
    where r.listing_id = l.id
  ) as redeemed_count
  -- remaining inventory checked in RPCs; UI uses quota - redeemed_count
from public.listings l;

-- ---------------------------------------------------------------------------
-- RPC: start_attempt
-- ---------------------------------------------------------------------------

create or replace function public.start_attempt(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_listing public.listings%rowtype;
  v_attempt public.attempts%rowtype;
  v_token text;
  v_survey text;
  v_recent int;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select * into v_listing
  from public.listings
  where id = p_listing_id
    and status = 'approved';

  if not found then
    raise exception 'listing_unavailable' using errcode = 'P0001';
  end if;

  if v_listing.publisher_id = v_user then
    raise exception 'cannot_attempt_own_listing' using errcode = 'P0001';
  end if;

  if v_listing.opens_at > now() then
    raise exception 'listing_not_open' using errcode = 'P0001';
  end if;

  if v_listing.closes_at is not null and v_listing.closes_at < now() then
    raise exception 'listing_closed' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.redemptions
    where listing_id = p_listing_id and user_id = v_user
  ) then
    raise exception 'already_redeemed' using errcode = 'P0001';
  end if;

  if (
    select count(*) from public.redemptions where listing_id = p_listing_id
  ) >= v_listing.quota then
    raise exception 'quota_full' using errcode = 'P0001';
  end if;

  if (
    select count(*) from public.vouchers
    where listing_id = p_listing_id and status = 'locked'
  ) < 1 then
    raise exception 'no_vouchers' using errcode = 'P0001';
  end if;

  -- rate limit: max 5 new attempts across all listings in 10 minutes
  select count(*) into v_recent
  from public.attempts
  where user_id = v_user
    and started_at > now() - interval '10 minutes';

  -- Reuse active attempt (does not count as new)
  select * into v_attempt
  from public.attempts
  where listing_id = p_listing_id
    and user_id = v_user
    and status = 'started'
    and expires_at > now()
  order by started_at desc
  limit 1;

  if found then
    v_survey := public.append_token_to_survey_url(
      v_listing.survey_url,
      v_listing.token_query_param,
      v_attempt.token
    );
    return jsonb_build_object(
      'attempt_id', v_attempt.id,
      'token', v_attempt.token,
      'expires_at', v_attempt.expires_at,
      'survey_url', v_survey,
      'reused', true
    );
  end if;

  if v_recent >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  -- generate unique token
  loop
    v_token := public.generate_attempt_token();
    exit when not exists (select 1 from public.attempts where token = v_token);
  end loop;

  insert into public.attempts (listing_id, user_id, token, expires_at)
  values (p_listing_id, v_user, v_token, now() + interval '48 hours')
  returning * into v_attempt;

  v_survey := public.append_token_to_survey_url(
    v_listing.survey_url,
    v_listing.token_query_param,
    v_attempt.token
  );

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'token', v_attempt.token,
    'expires_at', v_attempt.expires_at,
    'survey_url', v_survey,
    'reused', false
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: redeem_attempt
-- ---------------------------------------------------------------------------

create or replace function public.redeem_attempt(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_token text := upper(trim(p_token));
  v_attempt public.attempts%rowtype;
  v_listing public.listings%rowtype;
  v_voucher public.vouchers%rowtype;
  v_redemption public.redemptions%rowtype;
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if v_token is null or length(v_token) < 8 then
    raise exception 'invalid_token' using errcode = 'P0001';
  end if;

  select * into v_attempt
  from public.attempts
  where token = v_token
  for update;

  if not found then
    raise exception 'invalid_token' using errcode = 'P0001';
  end if;

  if v_attempt.user_id <> v_user then
    update public.attempts
    set redeem_fail_count = redeem_fail_count + 1
    where id = v_attempt.id;
    raise exception 'token_not_yours' using errcode = 'P0001';
  end if;

  if v_attempt.redeem_fail_count >= 10 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;

  if v_attempt.status = 'redeemed' then
    raise exception 'already_used' using errcode = 'P0001';
  end if;

  if v_attempt.expires_at < now() or v_attempt.status = 'expired' then
    update public.attempts set status = 'expired' where id = v_attempt.id and status = 'started';
    raise exception 'token_expired' using errcode = 'P0001';
  end if;

  select * into v_listing
  from public.listings
  where id = v_attempt.listing_id
  for update;

  if v_listing.publisher_id = v_user then
    raise exception 'cannot_redeem_own_listing' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.redemptions
    where listing_id = v_attempt.listing_id and user_id = v_user
  ) then
    raise exception 'already_redeemed' using errcode = 'P0001';
  end if;

  if (
    select count(*) from public.redemptions where listing_id = v_attempt.listing_id
  ) >= v_listing.quota then
    raise exception 'quota_full' using errcode = 'P0001';
  end if;

  select * into v_voucher
  from public.vouchers
  where listing_id = v_attempt.listing_id
    and status = 'locked'
  order by created_at asc
  limit 1
  for update skip locked;

  if not found then
    raise exception 'no_vouchers' using errcode = 'P0001';
  end if;

  update public.vouchers
  set status = 'issued',
      issued_to = v_user,
      issued_at = now()
  where id = v_voucher.id;

  update public.attempts
  set status = 'redeemed',
      redeemed_at = now()
  where id = v_attempt.id;

  insert into public.redemptions (listing_id, user_id, attempt_id, voucher_id)
  values (v_attempt.listing_id, v_user, v_attempt.id, v_voucher.id)
  returning * into v_redemption;

  return jsonb_build_object(
    'redemption_id', v_redemption.id,
    'listing_id', v_attempt.listing_id,
    'listing_title', v_listing.title,
    'reward_type', v_listing.reward_type,
    'reward_description', v_listing.reward_description,
    'voucher_code', v_voucher.code,
    'issued_at', v_redemption.created_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: my_rewards (safe reveal of already-issued codes)
-- ---------------------------------------------------------------------------

create or replace function public.my_rewards()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb order by t.created_at desc)
    from (
      select
        r.id,
        r.listing_id,
        l.title as listing_title,
        l.reward_type,
        l.reward_description,
        v.code as voucher_code,
        r.created_at
      from public.redemptions r
      join public.listings l on l.id = r.listing_id
      join public.vouchers v on v.id = r.voucher_id
      where r.user_id = v_user
    ) t
  ), '[]'::jsonb);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: my_active_attempt for a listing
-- ---------------------------------------------------------------------------

create or replace function public.my_active_attempt(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_attempt public.attempts%rowtype;
  v_listing public.listings%rowtype;
begin
  if v_user is null then
    return null;
  end if;

  select * into v_attempt
  from public.attempts
  where listing_id = p_listing_id
    and user_id = v_user
    and status = 'started'
    and expires_at > now()
  order by started_at desc
  limit 1;

  if not found then
    return null;
  end if;

  select * into v_listing from public.listings where id = p_listing_id;

  return jsonb_build_object(
    'attempt_id', v_attempt.id,
    'token', v_attempt.token,
    'expires_at', v_attempt.expires_at,
    'survey_url', public.append_token_to_survey_url(
      v_listing.survey_url,
      v_listing.token_query_param,
      v_attempt.token
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.listings enable row level security;
alter table public.vouchers enable row level security;
alter table public.attempts enable row level security;
alter table public.redemptions enable row level security;

-- Listings: anyone authenticated can read approved; publishers can read own
drop policy if exists listings_select_approved on public.listings;
create policy listings_select_approved
  on public.listings for select
  to authenticated
  using (status = 'approved' or publisher_id = auth.uid());

-- No client insert/update on listings in first slice (ops / SQL seed)

-- Vouchers: no direct client access
drop policy if exists vouchers_no_direct on public.vouchers;
-- (no policies = deny all for authenticated/anon when RLS on)

-- Attempts: user can see own (token visible for UX after start)
drop policy if exists attempts_select_own on public.attempts;
create policy attempts_select_own
  on public.attempts for select
  to authenticated
  using (user_id = auth.uid());

-- Redemptions: user can see own metadata (not voucher code — use my_rewards)
drop policy if exists redemptions_select_own on public.redemptions;
create policy redemptions_select_own
  on public.redemptions for select
  to authenticated
  using (user_id = auth.uid());

grant usage on schema public to authenticated, anon;
grant select on public.listings to authenticated;
grant select on public.listing_cards to authenticated;
grant select on public.attempts to authenticated;
grant select on public.redemptions to authenticated;

grant execute on function public.start_attempt(uuid) to authenticated;
grant execute on function public.redeem_attempt(text) to authenticated;
grant execute on function public.my_rewards() to authenticated;
grant execute on function public.my_active_attempt(uuid) to authenticated;
