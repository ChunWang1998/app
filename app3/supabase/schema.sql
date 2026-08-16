-- 鄰汪 — Supabase schema
-- Dashboard → SQL Editor 執行一次。白名單是下次升級「已事先訂閱」的依據。

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  login_key text unique not null,
  provider text not null default 'phone',
  subscription text not null default 'none'
    check (subscription in ('none', 'founder', 'paid')),
  created_at timestamptz not null default now()
);

-- First 100 login_key values. Survives the v2 paywall upgrade.
create table if not exists public.founder_whitelist (
  login_key text primary key,
  provider text not null default 'phone',
  slot_no int not null check (slot_no between 1 and 100),
  claimed_at timestamptz not null default now()
);

create or replace function public.founder_count()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.founder_whitelist;
$$;

create or replace function public.is_founder(p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.founder_whitelist where login_key = p_key
  );
$$;

create or replace function public.claim_founder(p_key text, p_provider text default 'phone')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if p_key is null or length(trim(p_key)) < 9 then
    return jsonb_build_object('ok', false, 'already', false);
  end if;

  if exists(select 1 from public.founder_whitelist where login_key = p_key) then
    insert into public.accounts (login_key, provider, subscription)
    values (p_key, coalesce(p_provider, 'phone'), 'founder')
    on conflict (login_key) do update set subscription = 'founder';
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  select count(*) into n from public.founder_whitelist;
  if n >= 100 then
    insert into public.accounts (login_key, provider, subscription)
    values (p_key, coalesce(p_provider, 'phone'), 'none')
    on conflict (login_key) do nothing;
    return jsonb_build_object('ok', false, 'already', false);
  end if;

  insert into public.founder_whitelist (login_key, provider, slot_no)
  values (p_key, coalesce(p_provider, 'phone'), n + 1);

  insert into public.accounts (login_key, provider, subscription)
  values (p_key, coalesce(p_provider, 'phone'), 'founder')
  on conflict (login_key) do update set subscription = 'founder';

  return jsonb_build_object('ok', true, 'already', false, 'slot_no', n + 1);
end;
$$;

grant execute on function public.founder_count() to anon, authenticated;
grant execute on function public.is_founder(text) to anon, authenticated;
grant execute on function public.claim_founder(text, text) to anon, authenticated;

create table if not exists public.profiles (
  account_id uuid primary key references public.accounts (id),
  city text not null,
  district text not null,
  dog_name text not null,
  owner_nick text,
  breed text,
  size text,
  age_range text,
  personalities text[] not null default '{}',
  slots jsonb not null default '[]',
  places text[] not null default '{}',
  play_with text not null default 'parallel',
  intro text,
  photo_ok boolean not null default false,
  can_photo boolean not null default true,
  outing_count int not null default 0,
  connect_count int not null default 0,
  captain_count int not null default 0,
  member_count int not null default 0,
  captain_score int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.connects (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.accounts (id),
  to_id uuid not null references public.accounts (id),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (from_id, to_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  connect_id uuid not null references public.connects (id),
  from_id uuid not null references public.accounts (id),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.meet_confirms (
  connect_id uuid not null references public.connects (id),
  account_id uuid not null references public.accounts (id),
  confirmed_at timestamptz not null default now(),
  primary key (connect_id, account_id)
);

create table if not exists public.gatherings (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.accounts (id),
  city text not null,
  name text not null,
  event_date date not null,
  place text not null,
  kind text not null,
  fee int not null default 0,
  intro text,
  line_group_url text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.gathering_joins (
  gathering_id uuid not null references public.gatherings (id),
  account_id uuid not null references public.accounts (id),
  joined_at timestamptz not null default now(),
  primary key (gathering_id, account_id)
);

create table if not exists public.gathering_likes (
  gathering_id uuid not null references public.gatherings (id),
  account_id uuid not null references public.accounts (id),
  created_at timestamptz not null default now(),
  primary key (gathering_id, account_id)
);

alter table public.accounts enable row level security;
alter table public.founder_whitelist enable row level security;
alter table public.profiles enable row level security;
alter table public.connects enable row level security;
alter table public.messages enable row level security;
alter table public.meet_confirms enable row level security;
alter table public.gatherings enable row level security;
alter table public.gathering_joins enable row level security;
alter table public.gathering_likes enable row level security;
