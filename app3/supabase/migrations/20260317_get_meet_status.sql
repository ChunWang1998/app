-- Meet status read (chat UI: none / one / both confirmed)
create or replace function public.get_meet_status(p_key text, p_connect_id uuid)
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
  select * into c from public.connects where id = p_connect_id;
  if not found or (c.from_id <> a.id and c.to_id <> a.id) then
    return jsonb_build_object('ok', false, 'code', 'auth');
  end if;
  return jsonb_build_object(
    'ok', true,
    'confirmedBy', coalesce((
      select jsonb_agg(account_id)
      from public.meet_confirms where connect_id = p_connect_id
    ), '[]'::jsonb),
    'counted', coalesce(c.outing_counted, false)
  );
end;
$$;

grant execute on function public.get_meet_status(text, uuid) to anon, authenticated;
