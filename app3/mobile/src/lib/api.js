import { supabase, mapRpcError } from './supabase';

export async function fetchApprovedListings() {
  const { data, error } = await supabase
    .from('listing_cards')
    .select('*')
    .eq('status', 'approved')
    .order('opens_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchListing(id) {
  const { data, error } = await supabase
    .from('listing_cards')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function startAttempt(listingId) {
  const { data, error } = await supabase.rpc('start_attempt', {
    p_listing_id: listingId,
  });
  if (error) throw new Error(mapRpcError(error));
  return data;
}

export async function redeemAttempt(token) {
  const { data, error } = await supabase.rpc('redeem_attempt', {
    p_token: token,
  });
  if (error) throw new Error(mapRpcError(error));
  return data;
}

export async function fetchMyRewards() {
  const { data, error } = await supabase.rpc('my_rewards');
  if (error) throw new Error(mapRpcError(error));
  return data || [];
}

export async function fetchActiveAttempt(listingId) {
  const { data, error } = await supabase.rpc('my_active_attempt', {
    p_listing_id: listingId,
  });
  if (error) throw new Error(mapRpcError(error));
  return data;
}
