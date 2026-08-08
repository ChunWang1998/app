-- 答禮 seed（第一刀）
-- 前置：先執行 schema.sql，並用 Auth 建立至少一個測試帳號
-- 把下面的 publisher UUID 換成你的 auth.users.id

-- 查自己的 user id：
--   select id, email from auth.users;

do $$
declare
  -- ★ 改成你的測試帳號 UUID
  v_publisher uuid := '00000000-0000-0000-0000-000000000001';
  v_listing uuid;
begin
  if not exists (select 1 from auth.users where id = v_publisher) then
    raise exception '請先把 v_publisher 改成真實的 auth.users.id';
  end if;

  insert into public.listings (
    id,
    publisher_id,
    title,
    category,
    estimated_minutes,
    open_days,
    quota,
    eligibility_note,
    survey_url,
    token_query_param,
    reward_type,
    reward_description,
    status,
    opens_at,
    closes_at
  ) values (
    gen_random_uuid(),
    v_publisher,
    '大學生咖啡消費習慣調查',
    'academic',
    8,
    21,
    5,
    '18 歲以上；台灣地區',
    'https://docs.google.com/forms/d/e/EXAMPLE/viewform',
    'completion_code',
    'starbucks',
    '星巴克中杯飲料券 × 1',
    'approved',
    now() - interval '1 day',
    now() + interval '20 days'
  )
  returning id into v_listing;

  insert into public.vouchers (listing_id, code, status) values
    (v_listing, 'SB-DEMO-0001', 'locked'),
    (v_listing, 'SB-DEMO-0002', 'locked'),
    (v_listing, 'SB-DEMO-0003', 'locked'),
    (v_listing, 'SB-DEMO-0004', 'locked'),
    (v_listing, 'SB-DEMO-0005', 'locked');

  insert into public.listings (
    publisher_id,
    title,
    category,
    estimated_minutes,
    open_days,
    quota,
    eligibility_note,
    survey_url,
    reward_type,
    reward_description,
    status,
    opens_at,
    closes_at
  ) values (
    v_publisher,
    '超商鮮食購買動機快問',
    'product',
    5,
    14,
    3,
    '近一個月有逛超商即可',
    'https://www.surveycake.com/s/EXAMPLE',
    'convenience',
    '超商 50 元電子禮券 × 1',
    'approved',
    now(),
    now() + interval '13 days'
  )
  returning id into v_listing;

  insert into public.vouchers (listing_id, code, status) values
    (v_listing, 'CV-DEMO-0001', 'locked'),
    (v_listing, 'CV-DEMO-0002', 'locked'),
    (v_listing, 'CV-DEMO-0003', 'locked');
end $$;
