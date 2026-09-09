-- Client-side IAP gate: stop enforcing founder/paid on server RPCs.
-- Also allow unlimited registration (no founder whitelist cap).
-- Run in Supabase SQL editor against the live project.

create or replace function public.has_valid_sub(a public.accounts)
returns boolean
language sql
immutable
as $$
  select true;
$$;

create or replace function public.register_founder(
  p_key text,
  p_provider text default 'phone',
  p_profile jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  acc public.accounts;
  prof public.profiles;
  dog text;
  city text;
  district text;
  result jsonb;
  already boolean := false;
begin
  if p_key is null or length(trim(p_key)) < 9 then
    return jsonb_build_object('ok', false, 'already', false, 'code', 'invalid');
  end if;
  dog := trim(coalesce(
    p_profile->'dogs'->0->>'dogName',
    p_profile->>'dogName',
    ''
  ));
  city := trim(coalesce(p_profile->>'city', ''));
  district := trim(coalesce(p_profile->>'district', ''));
  if dog = '' or city = '' or district = '' then
    return jsonb_build_object('ok', false, 'already', false, 'code', 'invalid');
  end if;
  if city not in (
    '基隆市', '臺北市', '新北市', '桃園市', '新竹市', '新竹縣', '苗栗縣', '臺中市',
    '彰化縣', '南投縣', '雲林縣', '嘉義市', '嘉義縣', '臺南市', '高雄市', '屏東縣',
    '宜蘭縣', '花蓮縣', '臺東縣', '澎湖縣', '金門縣', '連江縣'
  ) then
    return jsonb_build_object('ok', false, 'already', false, 'code', 'city');
  end if;

  perform pg_advisory_xact_lock(881001);

  if exists(select 1 from public.accounts where login_key = trim(p_key) and deleted_at is null) then
    already := true;
  end if;

  insert into public.accounts (login_key, provider, subscription, deleted_at)
  values (trim(p_key), coalesce(p_provider, 'phone'), 'none', null)
  on conflict (login_key) do update
    set deleted_at = null,
        provider = coalesce(p_provider, public.accounts.provider);

  select * into acc from public.accounts where login_key = trim(p_key);
  select * into prof from public.profiles where account_id = acc.id;
  if already and prof.account_id is not null then
    return jsonb_build_object(
      'ok', true,
      'already', true,
      'founder', false,
      'account_id', acc.id,
      'accountId', acc.id,
      'subscription', acc.subscription,
      'profile', public.profile_to_json(prof)
    );
  end if;

  result := public.upsert_profile(trim(p_key), p_profile);
  return result || jsonb_build_object(
    'already', already,
    'founder', false
  );
end;
$$;
