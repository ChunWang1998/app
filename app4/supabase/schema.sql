-- app4 身份牽線 — Supabase schema
-- Dashboard → SQL Editor 執行（可重複執行）。
-- 免登入：以 device_id 識別。訂閱權益僅客戶端 IAP 判定。
-- 每日額度日界：Asia/Taipei。配對額度只扣發起者。

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  device_id text unique not null,
  own_identities text[] not null default '{}',
  interest_identities text[] not null default '{}',
  line_id text not null,
  interests_changed_at timestamptz,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint profiles_own_len check (
    cardinality(own_identities) between 1 and 5
  ),
  constraint profiles_interest_len check (
    cardinality(interest_identities) between 1 and 2
  ),
  constraint profiles_line_len check (
    char_length(trim(line_id)) between 1 and 64
  )
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  user_low_id uuid not null references public.profiles (id) on delete cascade,
  user_high_id uuid not null references public.profiles (id) on delete cascade,
  initiator_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint matches_ordered check (user_low_id < user_high_id),
  constraint matches_distinct check (user_low_id <> user_high_id),
  unique (user_low_id, user_high_id)
);

create index if not exists matches_initiator_idx on public.matches (initiator_id);
create index if not exists matches_low_idx on public.matches (user_low_id);
create index if not exists matches_high_idx on public.matches (user_high_id);

create table if not exists public.match_daily_usage (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  count int not null default 0 check (count >= 0),
  primary key (profile_id, day)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  match_id uuid references public.matches (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint reports_distinct check (reporter_id <> target_id)
);

create index if not exists reports_reporter_idx on public.reports (reporter_id);

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.match_daily_usage enable row level security;
alter table public.reports enable row level security;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.app4_today()
returns date
language sql
stable
as $$
  select (timezone('Asia/Taipei', now()))::date;
$$;

create or replace function public.app4_require_profile(p_device_id text)
returns public.profiles
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  p public.profiles;
begin
  if p_device_id is null or length(trim(p_device_id)) < 8 then
    raise exception 'invalid_device';
  end if;
  select * into p from public.profiles
    where device_id = trim(p_device_id) and deleted_at is null;
  if not found then
    raise exception 'not_registered';
  end if;
  return p;
end;
$$;

create or replace function public.app4_profile_public(p public.profiles)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', p.id,
    'own_identities', to_jsonb(p.own_identities),
    'interest_identities', to_jsonb(p.interest_identities),
    'line_id', p.line_id,
    'interests_changed_at', p.interests_changed_at,
    'last_active_at', p.last_active_at,
    'created_at', p.created_at
  );
$$;

create or replace function public.app4_arrays_overlap(a text[], b text[])
returns boolean
language sql
immutable
as $$
  select exists (
    select 1 from unnest(a) x where x = any (b)
  );
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.register_or_load_profile(
  p_device_id text,
  p_own text[] default null,
  p_interest text[] default null,
  p_line_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
  own text[];
  interest text[];
  line text;
begin
  if p_device_id is null or length(trim(p_device_id)) < 8 then
    return jsonb_build_object('ok', false, 'code', 'invalid_device');
  end if;

  select * into p from public.profiles
    where device_id = trim(p_device_id) and deleted_at is null;

  if found then
    update public.profiles
      set last_active_at = now(), updated_at = now()
      where id = p.id
      returning * into p;
    return jsonb_build_object(
      'ok', true,
      'already', true,
      'profile', public.app4_profile_public(p)
    );
  end if;

  -- New registration requires full payload
  if p_own is null or p_interest is null or p_line_id is null then
    return jsonb_build_object('ok', false, 'code', 'need_onboarding');
  end if;

  own := (
    select array_agg(distinct trim(x))
    from unnest(p_own) x
    where length(trim(x)) > 0
  );
  interest := (
    select array_agg(distinct trim(x))
    from unnest(p_interest) x
    where length(trim(x)) > 0
  );
  line := trim(p_line_id);

  if own is null or cardinality(own) < 1 or cardinality(own) > 5 then
    return jsonb_build_object('ok', false, 'code', 'invalid_own');
  end if;
  if interest is null or cardinality(interest) < 1 or cardinality(interest) > 2 then
    return jsonb_build_object('ok', false, 'code', 'invalid_interest');
  end if;
  if line is null or char_length(line) < 1 or char_length(line) > 64 then
    return jsonb_build_object('ok', false, 'code', 'invalid_line');
  end if;

  insert into public.profiles (
    device_id, own_identities, interest_identities, line_id, last_active_at
  ) values (
    trim(p_device_id), own, interest, line, now()
  )
  returning * into p;

  return jsonb_build_object(
    'ok', true,
    'already', false,
    'profile', public.app4_profile_public(p)
  );
end;
$$;

create or replace function public.update_line_id(p_device_id text, p_line_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
  line text;
begin
  p := public.app4_require_profile(p_device_id);
  line := trim(p_line_id);
  if line is null or char_length(line) < 1 or char_length(line) > 64 then
    return jsonb_build_object('ok', false, 'code', 'invalid_line');
  end if;
  update public.profiles
    set line_id = line, updated_at = now(), last_active_at = now()
    where id = p.id
    returning * into p;
  return jsonb_build_object('ok', true, 'profile', public.app4_profile_public(p));
end;
$$;

create or replace function public.update_interests(
  p_device_id text,
  p_interest text[],
  p_claimed_paid boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
  interest text[];
begin
  p := public.app4_require_profile(p_device_id);

  if not coalesce(p_claimed_paid, false) then
    return jsonb_build_object('ok', false, 'code', 'need_paid');
  end if;

  if p.interests_changed_at is not null
     and p.interests_changed_at > now() - interval '168 hours' then
    return jsonb_build_object(
      'ok', false,
      'code', 'cooldown',
      'next_at', p.interests_changed_at + interval '168 hours'
    );
  end if;

  interest := (
    select array_agg(distinct trim(x))
    from unnest(p_interest) x
    where length(trim(x)) > 0
  );
  if interest is null or cardinality(interest) < 1 or cardinality(interest) > 2 then
    return jsonb_build_object('ok', false, 'code', 'invalid_interest');
  end if;

  update public.profiles
    set interest_identities = interest,
        interests_changed_at = now(),
        updated_at = now(),
        last_active_at = now()
    where id = p.id
    returning * into p;

  return jsonb_build_object('ok', true, 'profile', public.app4_profile_public(p));
end;
$$;

create or replace function public.touch_active(p_device_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
begin
  p := public.app4_require_profile(p_device_id);
  update public.profiles
    set last_active_at = now(), updated_at = now()
    where id = p.id
    returning * into p;
  return jsonb_build_object('ok', true, 'profile', public.app4_profile_public(p));
end;
$$;

create or replace function public.get_daily_usage(
  p_device_id text,
  p_claimed_paid boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.profiles;
  d date := public.app4_today();
  used int := 0;
  lim int;
begin
  p := public.app4_require_profile(p_device_id);
  lim := case when coalesce(p_claimed_paid, false) then 5 else 1 end;
  select coalesce(u.count, 0) into used
    from public.match_daily_usage u
    where u.profile_id = p.id and u.day = d;
  used := coalesce(used, 0);
  return jsonb_build_object(
    'ok', true,
    'day', d,
    'used', used,
    'limit', lim,
    'remaining', greatest(lim - used, 0)
  );
end;
$$;

create or replace function public.daily_match(
  p_device_id text,
  p_claimed_paid boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.profiles;
  other public.profiles;
  d date := public.app4_today();
  used int := 0;
  lim int;
  low uuid;
  high uuid;
  mid uuid;
  attempt int := 0;
begin
  me := public.app4_require_profile(p_device_id);
  lim := case when coalesce(p_claimed_paid, false) then 5 else 1 end;

  select coalesce(u.count, 0) into used
    from public.match_daily_usage u
    where u.profile_id = me.id and u.day = d;
  used := coalesce(used, 0);
  if used >= lim then
    return jsonb_build_object('ok', false, 'code', 'quota', 'used', used, 'limit', lim);
  end if;

  update public.profiles
    set last_active_at = now(), updated_at = now()
    where id = me.id;

  <<pick>>
  loop
    attempt := attempt + 1;
    if attempt > 5 then
      return jsonb_build_object('ok', false, 'code', 'no_candidates');
    end if;

    select c.* into other
    from public.profiles c
    where c.deleted_at is null
      and c.id <> me.id
      and char_length(trim(c.line_id)) > 0
      and public.app4_arrays_overlap(me.interest_identities, c.own_identities)
      and public.app4_arrays_overlap(c.interest_identities, me.own_identities)
      and not exists (
        select 1 from public.matches m
        where (m.user_low_id = least(me.id, c.id)
           and m.user_high_id = greatest(me.id, c.id))
      )
      and not exists (
        select 1 from public.reports r
        where r.reporter_id = me.id and r.target_id = c.id
      )
    order by random()
    limit 1;

    if not found then
      return jsonb_build_object('ok', false, 'code', 'no_candidates');
    end if;

    low := least(me.id, other.id);
    high := greatest(me.id, other.id);

    begin
      insert into public.matches (user_low_id, user_high_id, initiator_id)
      values (low, high, me.id)
      returning id into mid;
      exit pick;
    exception when unique_violation then
      -- retry
    end;
  end loop;

  insert into public.match_daily_usage (profile_id, day, count)
  values (me.id, d, 1)
  on conflict (profile_id, day) do update
    set count = public.match_daily_usage.count + 1;

  select coalesce(u.count, 0) into used
    from public.match_daily_usage u
    where u.profile_id = me.id and u.day = d;

  return jsonb_build_object(
    'ok', true,
    'match_id', mid,
    'me', public.app4_profile_public(me),
    'other', public.app4_profile_public(other),
    'used', used,
    'limit', lim,
    'remaining', greatest(lim - used, 0)
  );
end;
$$;

create or replace function public.list_my_matches(p_device_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.profiles;
  rows jsonb;
begin
  me := public.app4_require_profile(p_device_id);

  select coalesce(jsonb_agg(item order by created_at desc), '[]'::jsonb)
  into rows
  from (
    select jsonb_build_object(
      'match_id', m.id,
      'created_at', m.created_at,
      'initiator_id', m.initiator_id,
      'other', public.app4_profile_public(o)
    ) as item,
    m.created_at
    from public.matches m
    join public.profiles o
      on o.id = case when m.user_low_id = me.id then m.user_high_id else m.user_low_id end
    where (m.user_low_id = me.id or m.user_high_id = me.id)
      and o.deleted_at is null
  ) q;

  return jsonb_build_object('ok', true, 'matches', rows);
end;
$$;

create or replace function public.report_user(
  p_device_id text,
  p_target_id uuid,
  p_reason text,
  p_match_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.profiles;
  reason text;
begin
  me := public.app4_require_profile(p_device_id);
  if p_target_id is null or p_target_id = me.id then
    return jsonb_build_object('ok', false, 'code', 'invalid_target');
  end if;
  if not exists (
    select 1 from public.profiles t
    where t.id = p_target_id and t.deleted_at is null
  ) then
    return jsonb_build_object('ok', false, 'code', 'not_found');
  end if;

  reason := trim(coalesce(p_reason, ''));
  if char_length(reason) < 1 then
    return jsonb_build_object('ok', false, 'code', 'invalid_reason');
  end if;

  insert into public.reports (reporter_id, target_id, reason, match_id)
  values (me.id, p_target_id, left(reason, 200), p_match_id);

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.register_or_load_profile(text, text[], text[], text) to anon, authenticated;
grant execute on function public.update_line_id(text, text) to anon, authenticated;
grant execute on function public.update_interests(text, text[], boolean) to anon, authenticated;
grant execute on function public.touch_active(text) to anon, authenticated;
grant execute on function public.get_daily_usage(text, boolean) to anon, authenticated;
grant execute on function public.daily_match(text, boolean) to anon, authenticated;
grant execute on function public.list_my_matches(text) to anon, authenticated;
grant execute on function public.report_user(text, uuid, text, uuid) to anon, authenticated;
