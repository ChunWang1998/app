// Supabase Edge Function: push-connect
// Deploy: supabase functions deploy push-connect
// Sends Expo push when a Connect invite is created (recipient must be subscribed).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const { loginKey, toId, fromName } = await req.json();
    if (!loginKey || !toId) {
      return new Response(JSON.stringify({ ok: false, code: 'invalid' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data, error } = await supabase.rpc('list_push_tokens_for_connect', {
      p_key: loginKey,
      p_to: toId,
    });
    if (error) throw error;
    if (!data?.ok || !data.subscribed) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'unsubscribed' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const tokens = Array.isArray(data.tokens) ? data.tokens.filter(Boolean) : [];
    if (!tokens.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: 'no_token' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const name = String(fromName || '').trim() || 'Someone';
    const messages = tokens.map((to) => ({
      to,
      sound: 'default',
      title: '新的 Connect 邀請',
      body: `${name} 想跟你 Connect`,
      data: { type: 'connect_invite', toId },
    }));

    const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    const pushJson = await pushRes.json();

    return new Response(
      JSON.stringify({ ok: true, sent: tokens.length, result: pushJson }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e?.message || e) }),
      {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      },
    );
  }
});
