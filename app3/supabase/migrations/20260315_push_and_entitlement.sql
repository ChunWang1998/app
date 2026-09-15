-- Push tokens + IAP entitlement sync + expose subscribed on profile lists.
-- Run in Supabase SQL Editor (idempotent).

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts (id) on delete cascade,
  expo_push_token text not null,
  platform text not null default 'unknown',
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (account_id, expo_push_token)
);

create index if not exists device_tokens_account_idx
  on public.device_tokens (account_id)
  where active = true;

alter table public.device_tokens enable row level security;

create or replace function public.upsert_device_token(
  p_key text,
  p_token text,
  p_platform text default 'unknown'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.accounts;
begin
  a := public.require_account(p_key);
  if p_token is null or length(trim(p_token)) < 10 then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  insert into public.device_tokens (account_id, expo_push_token, platform, active, updated_at)
  values (a.id, trim(p_token), coalesce(nullif(trim(p_platform), ''), 'unknown'), true, now())
  on conflict (account_id, expo_push_token) do update
    set active = true,
        platform = excluded.platform,
        updated_at = now();
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.upsert_device_token(text, text, text) to anon, authenticated;

-- Client reports App Store IAP paid state so Explore can badge peers.
create or replace function public.sync_iap_entitlement(p_key text, p_paid boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.accounts;
  next_sub text;
begin
  a := public.require_account(p_key);
  -- Keep founder as founder; otherwise mirror paid/none from IAP.
  if a.subscription = 'founder' then
    next_sub := 'founder';
  elsif coalesce(p_paid, false) then
    next_sub := 'paid';
  else
    next_sub := 'none';
  end if;
  update public.accounts
    set subscription = next_sub
    where id = a.id
    returning * into a;
  return jsonb_build_object(
    'ok', true,
    'subscription', a.subscription,
    'subscribed', a.subscription in ('paid', 'founder')
  );
end;
$$;

grant execute on function public.sync_iap_entitlement(text, boolean) to anon, authenticated;

create or replace function public.list_city_profiles(p_key text, p_city text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  a public.accounts;
  blocked uuid[] := '{}';
begin
  begin
    a := public.require_account(p_key);
    select coalesce(array_agg(blocked_id), '{}') into blocked
      from public.blocks where blocker_id = a.id;
  exception when others then
    a := null;
  end;

  return coalesce((
    select jsonb_agg(
      public.profile_to_json(p)
      || jsonb_build_object(
        'isMe', a.id is not null and p.account_id = a.id,
        'subscribed', acc.subscription in ('paid', 'founder')
      )
    )
    from public.profiles p
    join public.accounts acc on acc.id = p.account_id
    where p.city = p_city
      and p.photo_ok = true
      and acc.deleted_at is null
      and (a.id is null or p.account_id <> all (blocked))
      and not exists (
        select 1 from public.blocks b
        where a.id is not null
          and b.blocker_id = p.account_id
          and b.blocked_id = a.id
      )
  ), '[]'::jsonb);
end;
$$;

create or replace function public.list_profiles(p_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  a public.accounts;
  blocked uuid[] := '{}';
begin
  begin
    a := public.require_account(p_key);
    select coalesce(array_agg(blocked_id), '{}') into blocked
      from public.blocks where blocker_id = a.id;
  exception when others then
    a := null;
  end;

  return coalesce((
    select jsonb_agg(
      public.profile_to_json(p)
      || jsonb_build_object(
        'isMe', a.id is not null and p.account_id = a.id,
        'subscribed', acc.subscription in ('paid', 'founder')
      )
    )
    from public.profiles p
    join public.accounts acc on acc.id = p.account_id
    where p.photo_ok = true
      and acc.deleted_at is null
      and (a.id is null or p.account_id <> all (blocked))
      and not exists (
        select 1 from public.blocks b
        where a.id is not null
          and b.blocker_id = p.account_id
          and b.blocked_id = a.id
      )
  ), '[]'::jsonb);
end;
$$;

-- Tokens for a target account (only if they are subscribed — product rule).
create or replace function public.list_push_tokens_for_connect(
  p_key text,
  p_to uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  a public.accounts;
  other public.accounts;
begin
  a := public.require_account(p_key);
  select * into other from public.accounts where id = p_to and deleted_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'missing', 'tokens', '[]'::jsonb);
  end if;
  -- Only push if recipient is subscribed (paid/founder).
  if other.subscription not in ('paid', 'founder') then
    return jsonb_build_object('ok', true, 'subscribed', false, 'tokens', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'ok', true,
    'subscribed', true,
    'tokens', coalesce((
      select jsonb_agg(distinct t.expo_push_token)
      from public.device_tokens t
      where t.account_id = other.id and t.active = true
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.list_push_tokens_for_connect(text, uuid) to anon, authenticated;
