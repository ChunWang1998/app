-- 鄰汪 — Supabase schema
-- Dashboard → SQL Editor 執行（可重複執行）。
-- 白名單是下次升級「已事先訂閱」的依據。
-- App 用 anon key + security definer RPC（試用期不驗證碼，以 login_key 當身份）。
-- 表格 RLS 預設拒絕直寫；公開讀取僅限已完成合照的檔案與聚會。

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  login_key text unique not null,
  provider text not null default 'phone',
  subscription text not null default 'none'
    check (subscription in ('none', 'founder', 'paid')),
  apple_sub text unique,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.accounts add column if not exists apple_sub text;
alter table public.accounts add column if not exists deleted_at timestamptz;

create unique index if not exists accounts_apple_sub_idx
  on public.accounts (apple_sub) where apple_sub is not null;

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
  acc public.accounts;
begin
  if p_key is null or length(trim(p_key)) < 9 then
    return jsonb_build_object('ok', false, 'already', false);
  end if;

  if exists(select 1 from public.founder_whitelist where login_key = p_key) then
    insert into public.accounts (login_key, provider, subscription, deleted_at)
    values (p_key, coalesce(p_provider, 'phone'), 'founder', null)
    on conflict (login_key) do update
      set subscription = 'founder',
          deleted_at = null,
          provider = coalesce(p_provider, public.accounts.provider);
    select * into acc from public.accounts where login_key = p_key;
    return jsonb_build_object('ok', true, 'already', true, 'account_id', acc.id);
  end if;

  select count(*) into n from public.founder_whitelist;
  if n >= 100 then
    insert into public.accounts (login_key, provider, subscription)
    values (p_key, coalesce(p_provider, 'phone'), 'none')
    on conflict (login_key) do update set deleted_at = null;
    select * into acc from public.accounts where login_key = p_key;
    return jsonb_build_object(
      'ok', false, 'already', false, 'account_id', acc.id
    );
  end if;

  insert into public.founder_whitelist (login_key, provider, slot_no)
  values (p_key, coalesce(p_provider, 'phone'), n + 1);

  insert into public.accounts (login_key, provider, subscription, deleted_at)
  values (p_key, coalesce(p_provider, 'phone'), 'founder', null)
  on conflict (login_key) do update
    set subscription = 'founder', deleted_at = null;

  select * into acc from public.accounts where login_key = p_key;
  return jsonb_build_object(
    'ok', true, 'already', false, 'slot_no', n + 1, 'account_id', acc.id
  );
end;
$$;

grant execute on function public.founder_count() to anon, authenticated;
grant execute on function public.is_founder(text) to anon, authenticated;
grant execute on function public.claim_founder(text, text) to anon, authenticated;

create table if not exists public.profiles (
  account_id uuid primary key references public.accounts (id) on delete cascade,
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
  photo_url text,
  photo_ok boolean not null default false,
  can_photo boolean not null default true,
  outing_count int not null default 0,
  connect_count int not null default 0,
  captain_count int not null default 0,
  member_count int not null default 0,
  captain_score int not null default 0,
  registered_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists photo_url text;
alter table public.profiles add column if not exists registered_at timestamptz;
update public.profiles set registered_at = coalesce(registered_at, updated_at, now())
  where registered_at is null;
alter table public.profiles alter column registered_at set default now();

create table if not exists public.connects (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.accounts (id),
  to_id uuid not null references public.accounts (id),
  status text not null default 'pending',
  outing_counted boolean not null default false,
  disconnected_by uuid references public.accounts (id),
  disconnected_at timestamptz,
  created_at timestamptz not null default now(),
  unique (from_id, to_id)
);

alter table public.connects add column if not exists outing_counted boolean not null default false;
alter table public.connects add column if not exists disconnected_by uuid references public.accounts (id);
alter table public.connects add column if not exists disconnected_at timestamptz;

alter table public.connects drop constraint if exists connects_status_check;
alter table public.connects add constraint connects_status_check
  check (status in ('pending', 'accepted', 'declined', 'disconnected'));

create unique index if not exists connects_pair_idx
  on public.connects (least(from_id, to_id), greatest(from_id, to_id));

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  connect_id uuid not null references public.connects (id) on delete cascade,
  from_id uuid not null references public.accounts (id),
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.meet_confirms (
  connect_id uuid not null references public.connects (id) on delete cascade,
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
  capacity int not null default 8,
  host_name text,
  counted_ended boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.gatherings add column if not exists capacity int not null default 8;
alter table public.gatherings add column if not exists host_name text;
alter table public.gatherings add column if not exists counted_ended boolean not null default false;

create table if not exists public.gathering_joins (
  gathering_id uuid not null references public.gatherings (id) on delete cascade,
  account_id uuid not null references public.accounts (id),
  joined_at timestamptz not null default now(),
  primary key (gathering_id, account_id)
);

create table if not exists public.gathering_likes (
  gathering_id uuid not null references public.gatherings (id) on delete cascade,
  account_id uuid not null references public.accounts (id),
  created_at timestamptz not null default now(),
  primary key (gathering_id, account_id)
);

create table if not exists public.blocks (
  blocker_id uuid not null references public.accounts (id) on delete cascade,
  blocked_id uuid not null references public.accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.accounts (id) on delete cascade,
  target_id uuid not null references public.accounts (id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
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
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles
  for select using (
    photo_ok = true
    and exists (
      select 1 from public.accounts a
      where a.id = profiles.account_id and a.deleted_at is null
    )
  );

drop policy if exists gatherings_public_read on public.gatherings;
create policy gatherings_public_read on public.gatherings for select using (true);

drop policy if exists gathering_joins_public_read on public.gathering_joins;
create policy gathering_joins_public_read on public.gathering_joins for select using (true);

drop policy if exists gathering_likes_public_read on public.gathering_likes;
create policy gathering_likes_public_read on public.gathering_likes for select using (true);

-- ---------------------------------------------------------------------------
-- RPC helpers
-- ---------------------------------------------------------------------------

create or replace function public.require_account(p_key text)
returns public.accounts
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  a public.accounts;
begin
  if p_key is null or length(trim(p_key)) < 9 then
    raise exception 'invalid';
  end if;
  select * into a from public.accounts
    where login_key = trim(p_key) and deleted_at is null;
  if not found then
    raise exception 'auth';
  end if;
  return a;
end;
$$;

create or replace function public.profile_to_json(p public.profiles)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', p.account_id,
    'city', p.city,
    'district', p.district,
    'dogName', p.dog_name,
    'ownerNick', coalesce(p.owner_nick, ''),
    'breed', coalesce(p.breed, ''),
    'size', coalesce(p.size, ''),
    'ageRange', coalesce(p.age_range, ''),
    'personalities', to_jsonb(p.personalities),
    'slots', coalesce(p.slots, '[]'::jsonb),
    'places', to_jsonb(p.places),
    'playWith', p.play_with,
    'intro', coalesce(p.intro, ''),
    'photoUri', p.photo_url,
    'photoOk', p.photo_ok,
    'canPhoto', p.can_photo,
    'outingCount', p.outing_count,
    'connectCount', p.connect_count,
    'captainCount', p.captain_count,
    'memberCount', p.member_count,
    'captainScore', p.captain_score,
    'registeredAt', p.registered_at,
    'updatedAt', p.updated_at,
    'isSeed', false,
    'isGuide', false
  );
$$;

create or replace function public.upsert_profile(p_key text, p_profile jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.accounts;
  p public.profiles;
  photo text;
begin
  a := public.require_account(p_key);
  photo := nullif(p_profile->>'photoUri', '');
  insert into public.profiles (
    account_id, city, district, dog_name, owner_nick, breed, size, age_range,
    personalities, slots, places, play_with, intro, photo_url, photo_ok, can_photo,
    registered_at, updated_at
  ) values (
    a.id,
    coalesce(p_profile->>'city', ''),
    coalesce(p_profile->>'district', ''),
    coalesce(p_profile->>'dogName', ''),
    p_profile->>'ownerNick',
    p_profile->>'breed',
    p_profile->>'size',
    p_profile->>'ageRange',
    coalesce(array(select jsonb_array_elements_text(p_profile->'personalities')), '{}'),
    coalesce(p_profile->'slots', '[]'::jsonb),
    coalesce(array(select jsonb_array_elements_text(p_profile->'places')), '{}'),
    coalesce(p_profile->>'playWith', 'parallel'),
    p_profile->>'intro',
    photo,
    coalesce((p_profile->>'photoOk')::boolean, photo is not null),
    coalesce((p_profile->>'canPhoto')::boolean, true),
    coalesce((p_profile->>'registeredAt')::timestamptz, now()),
    now()
  )
  on conflict (account_id) do update set
    city = excluded.city,
    district = excluded.district,
    dog_name = excluded.dog_name,
    owner_nick = excluded.owner_nick,
    breed = excluded.breed,
    size = excluded.size,
    age_range = excluded.age_range,
    personalities = excluded.personalities,
    slots = excluded.slots,
    places = excluded.places,
    play_with = excluded.play_with,
    intro = excluded.intro,
    photo_url = coalesce(excluded.photo_url, public.profiles.photo_url),
    photo_ok = excluded.photo_ok or public.profiles.photo_ok,
    can_photo = excluded.can_photo,
    updated_at = now();

  select * into p from public.profiles where account_id = a.id;
  return jsonb_build_object(
    'ok', true,
    'accountId', a.id,
    'subscription', a.subscription,
    'profile', public.profile_to_json(p)
  );
end;
$$;

create or replace function public.load_my_account(p_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  a public.accounts;
  p public.profiles;
begin
  a := public.require_account(p_key);
  select * into p from public.profiles where account_id = a.id;
  return jsonb_build_object(
    'ok', true,
    'accountId', a.id,
    'subscription', a.subscription,
    'loginKey', a.login_key,
    'provider', a.provider,
    'createdAt', a.created_at,
    'profile', case when p.account_id is null then null else public.profile_to_json(p) end
  );
end;
$$;

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
    select jsonb_agg(public.profile_to_json(p) || jsonb_build_object('isMe', a.id is not null and p.account_id = a.id))
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

create or replace function public.find_connect(p_a uuid, p_b uuid)
returns public.connects
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  c public.connects;
begin
  select * into c from public.connects
  where (from_id = p_a and to_id = p_b) or (from_id = p_b and to_id = p_a)
  limit 1;
  return c;
end;
$$;

create or replace function public.connect_to_json(c public.connects)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', c.id,
    'fromId', c.from_id,
    'toId', c.to_id,
    'status', c.status,
    'outingCounted', c.outing_counted,
    'disconnectedBy', c.disconnected_by,
    'disconnectedAt', c.disconnected_at,
    'createdAt', c.created_at
  );
$$;

create or replace function public.send_connect(p_key text, p_to uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.accounts;
  c public.connects;
  other public.accounts;
begin
  a := public.require_account(p_key);
  if a.id = p_to then
    return jsonb_build_object('ok', false, 'code', 'self');
  end if;
  select * into other from public.accounts where id = p_to and deleted_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  if exists (
    select 1 from public.blocks
    where (blocker_id = a.id and blocked_id = p_to)
       or (blocker_id = p_to and blocked_id = a.id)
  ) then
    return jsonb_build_object('ok', false, 'code', 'blocked');
  end if;

  c := public.find_connect(a.id, p_to);
  if c.id is not null then
    if c.status = 'disconnected' then
      update public.connects
        set status = 'pending',
            from_id = a.id,
            to_id = p_to,
            disconnected_by = null,
            disconnected_at = null,
            created_at = now()
        where id = c.id
        returning * into c;
    end if;
    return jsonb_build_object('ok', true, 'connect', public.connect_to_json(c));
  end if;

  insert into public.connects (from_id, to_id, status)
  values (a.id, p_to, 'pending')
  returning * into c;
  return jsonb_build_object('ok', true, 'connect', public.connect_to_json(c));
end;
$$;

create or replace function public.list_my_connects(p_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  a public.accounts;
begin
  a := public.require_account(p_key);
  return coalesce((
    select jsonb_agg(public.connect_to_json(c) order by c.created_at desc)
    from public.connects c
    where c.from_id = a.id or c.to_id = a.id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.set_connect_status(p_key text, p_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.accounts;
  c public.connects;
  was text;
begin
  a := public.require_account(p_key);
  if p_status not in ('accepted', 'declined', 'disconnected') then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  select * into c from public.connects where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  if c.to_id <> a.id and c.from_id <> a.id then
    return jsonb_build_object('ok', false, 'code', 'auth');
  end if;
  if p_status = 'accepted' and c.to_id <> a.id then
    return jsonb_build_object('ok', false, 'code', 'auth');
  end if;
  was := c.status;
  update public.connects set status = p_status where id = p_id returning * into c;
  if p_status = 'accepted' and was is distinct from 'accepted' then
    update public.profiles
      set connect_count = connect_count + 1, updated_at = now()
      where account_id in (c.from_id, c.to_id);
  end if;
  return jsonb_build_object('ok', true, 'connect', public.connect_to_json(c));
end;
$$;

create or replace function public.disconnect_connect(p_key text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.accounts;
  c public.connects;
begin
  a := public.require_account(p_key);
  select * into c from public.connects where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  if c.from_id <> a.id and c.to_id <> a.id then
    return jsonb_build_object('ok', false, 'code', 'auth');
  end if;
  update public.connects
    set status = 'disconnected',
        disconnected_by = a.id,
        disconnected_at = now()
    where id = p_id
    returning * into c;
  return jsonb_build_object('ok', true, 'connect', public.connect_to_json(c));
end;
$$;

create or replace function public.list_messages(p_key text, p_connect_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  a public.accounts;
  c public.connects;
begin
  a := public.require_account(p_key);
  select * into c from public.connects where id = p_connect_id;
  if not found or (c.from_id <> a.id and c.to_id <> a.id) then
    return jsonb_build_object('ok', false, 'code', 'auth');
  end if;
  return jsonb_build_object('ok', true, 'messages', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id,
      'fromId', m.from_id,
      'text', m.body,
      'at', m.created_at
    ) order by m.created_at)
    from public.messages m
    where m.connect_id = p_connect_id
  ), '[]'::jsonb));
end;
$$;

create or replace function public.send_message(p_key text, p_connect_id uuid, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.accounts;
  c public.connects;
  n int;
  body text;
begin
  a := public.require_account(p_key);
  select * into c from public.connects where id = p_connect_id;
  if not found or (c.from_id <> a.id and c.to_id <> a.id) then
    return jsonb_build_object('ok', false, 'code', 'auth');
  end if;
  if c.status = 'disconnected' then
    return jsonb_build_object('ok', false, 'code', 'disconnected');
  end if;
  if c.status <> 'accepted' then
    return jsonb_build_object('ok', false, 'code', 'pending');
  end if;
  body := trim(coalesce(p_body, ''));
  if length(body) = 0 then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  select count(*) into n from public.messages where connect_id = p_connect_id;
  if n >= 20 then
    return jsonb_build_object('ok', false, 'code', 'full');
  end if;
  insert into public.messages (connect_id, from_id, body)
  values (p_connect_id, a.id, body);
  return public.list_messages(p_key, p_connect_id);
end;
$$;

create or replace function public.confirm_meet(p_key text, p_connect_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.accounts;
  c public.connects;
  n int;
begin
  a := public.require_account(p_key);
  select * into c from public.connects where id = p_connect_id;
  if not found or (c.from_id <> a.id and c.to_id <> a.id) then
    return jsonb_build_object('ok', false, 'code', 'auth');
  end if;
  if c.status <> 'accepted' then
    return jsonb_build_object('ok', false, 'code', 'pending');
  end if;
  insert into public.meet_confirms (connect_id, account_id)
  values (p_connect_id, a.id)
  on conflict do nothing;

  select count(*) into n from public.meet_confirms where connect_id = p_connect_id;
  if n >= 2 and not c.outing_counted then
    update public.connects set outing_counted = true where id = p_connect_id;
    update public.profiles
      set outing_count = outing_count + 1, updated_at = now()
      where account_id in (c.from_id, c.to_id);
  end if;

  return jsonb_build_object(
    'ok', true,
    'confirmedBy', coalesce((
      select jsonb_agg(account_id)
      from public.meet_confirms where connect_id = p_connect_id
    ), '[]'::jsonb),
    'counted', (select outing_counted from public.connects where id = p_connect_id)
  );
end;
$$;

create or replace function public.apply_ended_gatherings()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.gatherings;
begin
  for g in
    select * from public.gatherings
    where counted_ended = false
      and event_date < (timezone('Asia/Taipei', now()))::date
  loop
    update public.gatherings set counted_ended = true where id = g.id;
    update public.profiles
      set captain_count = captain_count + 1, updated_at = now()
      where account_id = g.host_id;
    update public.profiles p
      set member_count = member_count + 1, updated_at = now()
      from public.gathering_joins j
      where j.gathering_id = g.id and j.account_id = p.account_id;
  end loop;
end;
$$;

create or replace function public.gathering_to_json(g public.gatherings, p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  joined int;
  extras uuid[];
  likes uuid[];
  host_score int := 0;
  ended boolean;
begin
  select coalesce(array_agg(account_id), '{}') into extras
    from public.gathering_joins where gathering_id = g.id;
  select coalesce(array_agg(account_id), '{}') into likes
    from public.gathering_likes where gathering_id = g.id;
  joined := coalesce(array_length(extras, 1), 0);
  select captain_score into host_score from public.profiles where account_id = g.host_id;
  ended := g.event_date < (timezone('Asia/Taipei', now()))::date;
  return jsonb_build_object(
    'id', g.id,
    'city', g.city,
    'name', g.name,
    'place', g.place,
    'type', g.kind,
    'fee', g.fee,
    'intro', coalesce(g.intro, ''),
    'lineGroupUrl', g.line_group_url,
    'hostId', g.host_id,
    'hostName', coalesce(g.host_name, ''),
    'dateISO', g.event_date,
    'createdAt', g.created_at,
    'isSeed', false,
    'baseJoined', 0,
    'capacity', g.capacity,
    'joinedCount', joined,
    'full', joined >= g.capacity,
    'iJoined', p_user is not null and p_user = any (extras),
    'iHost', p_user is not null and p_user = g.host_id,
    'ended', ended,
    'liked', p_user is not null and p_user = any (likes),
    'likeCount', coalesce(array_length(likes, 1), 0),
    'hostCaptainScore', coalesce(host_score, 0)
  );
end;
$$;

create or replace function public.list_city_gatherings(p_key text, p_city text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.accounts;
  uid uuid;
begin
  perform public.apply_ended_gatherings();
  begin
    a := public.require_account(p_key);
    uid := a.id;
  exception when others then
    uid := null;
  end;
  return coalesce((
    select jsonb_agg(public.gathering_to_json(g, uid) order by (
      select coalesce(pr.captain_score, 0) from public.profiles pr where pr.account_id = g.host_id
    ) desc, g.created_at)
    from public.gatherings g
    where g.city = p_city
  ), '[]'::jsonb);
end;
$$;

create or replace function public.create_gathering(p_key text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.accounts;
  g public.gatherings;
  nm text;
  place text;
  intro text;
  line text;
  kind text;
  fee int;
  cap int;
  d date;
begin
  a := public.require_account(p_key);
  if exists (
    select 1 from public.gatherings
    where host_id = a.id
      and event_date >= (timezone('Asia/Taipei', now()))::date
  ) then
    return jsonb_build_object('ok', false, 'code', 'already');
  end if;
  nm := trim(coalesce(p_payload->>'name', ''));
  place := trim(coalesce(p_payload->>'place', ''));
  intro := trim(coalesce(p_payload->>'intro', ''));
  line := trim(coalesce(p_payload->>'lineGroupUrl', ''));
  kind := coalesce(p_payload->>'type', '');
  fee := coalesce((p_payload->>'fee')::int, 0);
  cap := coalesce((p_payload->>'capacity')::int, 8);
  begin
    d := (p_payload->>'dateISO')::date;
  exception when others then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end;
  if nm = '' or char_length(nm) > 10 then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  if place = '' or kind = '' or d is null then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  if fee < 0 then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  if char_length(intro) > 50 then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  if line = '' then
    return jsonb_build_object('ok', false, 'code', 'line');
  end if;

  insert into public.gatherings (
    host_id, city, name, event_date, place, kind, fee, intro, line_group_url, capacity, host_name
  ) values (
    a.id,
    coalesce(p_payload->>'city', ''),
    nm, d, place, kind, fee, intro, line, cap,
    coalesce(p_payload->>'hostName', '')
  ) returning * into g;

  return jsonb_build_object('ok', true, 'gathering', public.gathering_to_json(g, a.id));
end;
$$;

create or replace function public.join_gathering(p_key text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.accounts;
  g public.gatherings;
  n int;
begin
  a := public.require_account(p_key);
  select * into g from public.gatherings where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  if g.host_id = a.id then
    return jsonb_build_object('ok', false, 'code', 'host');
  end if;
  if g.event_date < (timezone('Asia/Taipei', now()))::date then
    return jsonb_build_object('ok', false, 'code', 'ended');
  end if;
  select count(*) into n from public.gathering_joins where gathering_id = p_id;
  if n >= g.capacity then
    return jsonb_build_object('ok', false, 'code', 'full');
  end if;
  insert into public.gathering_joins (gathering_id, account_id)
  values (p_id, a.id)
  on conflict do nothing;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.like_gathering_host(p_key text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.accounts;
  g public.gatherings;
begin
  a := public.require_account(p_key);
  select * into g from public.gatherings where id = p_id;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'missing');
  end if;
  if g.event_date >= (timezone('Asia/Taipei', now()))::date then
    return jsonb_build_object('ok', false, 'code', 'early');
  end if;
  if g.host_id = a.id then
    return jsonb_build_object('ok', false, 'code', 'host');
  end if;
  if not exists (
    select 1 from public.gathering_joins where gathering_id = p_id and account_id = a.id
  ) then
    return jsonb_build_object('ok', false, 'code', 'join');
  end if;
  if exists (
    select 1 from public.gathering_likes where gathering_id = p_id and account_id = a.id
  ) then
    return jsonb_build_object('ok', false, 'code', 'already');
  end if;
  insert into public.gathering_likes (gathering_id, account_id) values (p_id, a.id);
  update public.profiles
    set captain_score = captain_score + 1, updated_at = now()
    where account_id = g.host_id;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.block_account(p_key text, p_target uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.accounts;
begin
  a := public.require_account(p_key);
  if a.id = p_target then
    return jsonb_build_object('ok', false, 'code', 'self');
  end if;
  insert into public.blocks (blocker_id, blocked_id)
  values (a.id, p_target)
  on conflict do nothing;
  update public.connects
    set status = 'disconnected', disconnected_by = a.id, disconnected_at = now()
    where status <> 'disconnected'
      and ((from_id = a.id and to_id = p_target) or (from_id = p_target and to_id = a.id));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.report_account(p_key text, p_target uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.accounts;
  reason text;
begin
  a := public.require_account(p_key);
  reason := trim(coalesce(p_reason, ''));
  if a.id = p_target then
    return jsonb_build_object('ok', false, 'code', 'self');
  end if;
  if length(reason) < 2 then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;
  insert into public.reports (reporter_id, target_id, reason)
  values (a.id, p_target, left(reason, 500));
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.delete_my_account(p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  a public.accounts;
begin
  a := public.require_account(p_key);
  delete from public.messages where from_id = a.id or connect_id in (
    select id from public.connects where from_id = a.id or to_id = a.id
  );
  delete from public.meet_confirms where account_id = a.id or connect_id in (
    select id from public.connects where from_id = a.id or to_id = a.id
  );
  delete from public.connects where from_id = a.id or to_id = a.id;
  delete from public.gathering_joins where account_id = a.id;
  delete from public.gathering_likes where account_id = a.id;
  delete from public.gatherings where host_id = a.id;
  delete from public.blocks where blocker_id = a.id or blocked_id = a.id;
  delete from public.reports where reporter_id = a.id;
  delete from public.profiles where account_id = a.id;
  update public.accounts set deleted_at = now() where id = a.id;
  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.upsert_profile(text, jsonb) to anon, authenticated;
grant execute on function public.load_my_account(text) to anon, authenticated;
grant execute on function public.list_city_profiles(text, text) to anon, authenticated;
grant execute on function public.send_connect(text, uuid) to anon, authenticated;
grant execute on function public.list_my_connects(text) to anon, authenticated;
grant execute on function public.set_connect_status(text, uuid, text) to anon, authenticated;
grant execute on function public.disconnect_connect(text, uuid) to anon, authenticated;
grant execute on function public.list_messages(text, uuid) to anon, authenticated;
grant execute on function public.send_message(text, uuid, text) to anon, authenticated;
grant execute on function public.confirm_meet(text, uuid) to anon, authenticated;
grant execute on function public.list_city_gatherings(text, text) to anon, authenticated;
grant execute on function public.create_gathering(text, jsonb) to anon, authenticated;
grant execute on function public.join_gathering(text, uuid) to anon, authenticated;
grant execute on function public.like_gathering_host(text, uuid) to anon, authenticated;
grant execute on function public.block_account(text, uuid) to anon, authenticated;
grant execute on function public.report_account(text, uuid, text) to anon, authenticated;
grant execute on function public.delete_my_account(text) to anon, authenticated;

-- Storage: public avatars. Ignore if this is not a hosted Supabase project.
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do update set public = true;

  execute 'drop policy if exists avatars_public_read on storage.objects';
  execute 'create policy avatars_public_read on storage.objects for select using (bucket_id = ''avatars'')';
  execute 'drop policy if exists avatars_public_write on storage.objects';
  execute 'create policy avatars_public_write on storage.objects for insert with check (bucket_id = ''avatars'')';
  execute 'drop policy if exists avatars_public_update on storage.objects';
  execute 'create policy avatars_public_update on storage.objects for update using (bucket_id = ''avatars'')';
exception
  when undefined_table then null;
  when undefined_object then null;
end;
$$;
