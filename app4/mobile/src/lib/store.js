import { getDeviceId } from './deviceId';
import { isIapPaid } from './entitlements';
import {
  isSupabaseConfigured,
  registerOrLoadProfile,
  updateLineIdCloud,
  updateIdentityNotesCloud,
  updateInterestsCloud,
  touchActiveCloud,
  getDailyUsageCloud,
  dailyMatchCloud,
  listMyMatchesCloud,
  listMessagesCloud,
  sendMessageCloud,
  submitConsentCloud,
  leaveChatCloud,
  reportUserCloud,
} from './cloud';
import {
  localRegisterOrLoad,
  localLoadProfile,
  localUpdateLine,
  localUpdateIdentityNotes,
  localUpdateInterests,
  localGetUsage,
  localDailyMatch,
  localListMatches,
  localListMessages,
  localSendMessage,
  localSubmitConsent,
  localLeaveChat,
  localReport,
} from './local';
import {
  FREE_DAILY_MATCHES,
  PAID_DAILY_MATCHES,
} from '../data/identities';

export function dailyLimit(paid) {
  return paid ? PAID_DAILY_MATCHES : FREE_DAILY_MATCHES;
}

function isCloudUnavailableError(err) {
  const msg = String(err?.message || err || '');
  return (
    msg.includes('Could not find the function public.register_or_load_profile') ||
    msg.includes('schema cache') ||
    msg.includes('network_timeout') ||
    msg.includes('Failed to fetch') ||
    msg.includes('Network request failed')
  );
}

export async function bootstrap() {
  const deviceId = await getDeviceId();
  const paid = await isIapPaid();

  if (isSupabaseConfigured) {
    try {
      const data = await registerOrLoadProfile(deviceId, null);
      if (data?.ok && data.profile) {
        try {
          await touchActiveCloud(deviceId);
        } catch {
          // ignore
        }
        return { deviceId, paid, profile: data.profile, cloud: true };
      }
      return { deviceId, paid, profile: null, cloud: true, code: data?.code };
    } catch (e) {
      if (!isCloudUnavailableError(e)) throw e;
      const profile = await localLoadProfile();
      return {
        deviceId,
        paid,
        profile,
        cloud: false,
        code: 'cloud_unavailable',
      };
    }
  }

  const profile = await localLoadProfile();
  return { deviceId, paid, profile, cloud: false };
}

export async function completeOnboarding({
  own_identities,
  own_identity_notes,
  interest_identities,
  line_id,
}) {
  const deviceId = await getDeviceId();
  const payload = {
    own_identities,
    own_identity_notes,
    interest_identities,
    line_id,
  };

  if (isSupabaseConfigured) {
    const data = await registerOrLoadProfile(deviceId, payload);
    if (!data?.ok) {
      throw new Error(data?.code || '註冊失敗');
    }
    return data.profile;
  }

  const data = await localRegisterOrLoad(deviceId, payload);
  if (!data?.ok) throw new Error(data?.code || '註冊失敗');
  return data.profile;
}

export async function fetchUsage() {
  const deviceId = await getDeviceId();
  const paid = await isIapPaid();
  if (isSupabaseConfigured) {
    return getDailyUsageCloud(deviceId, paid);
  }
  return localGetUsage(paid);
}

export async function runDailyMatch() {
  const deviceId = await getDeviceId();
  const paid = await isIapPaid();
  if (isSupabaseConfigured) {
    return dailyMatchCloud(deviceId, paid);
  }
  return localDailyMatch(paid);
}

export async function fetchMatches() {
  const deviceId = await getDeviceId();
  if (isSupabaseConfigured) {
    return listMyMatchesCloud(deviceId);
  }
  return localListMatches();
}

export async function fetchMessages(matchId) {
  const deviceId = await getDeviceId();
  if (isSupabaseConfigured) {
    return listMessagesCloud(deviceId, matchId);
  }
  return localListMessages(matchId);
}

export async function sendChatMessage(matchId, body) {
  const deviceId = await getDeviceId();
  if (isSupabaseConfigured) {
    return sendMessageCloud(deviceId, matchId, body);
  }
  return localSendMessage(matchId, body);
}

export async function submitContinueConsent(matchId, yes) {
  const deviceId = await getDeviceId();
  if (isSupabaseConfigured) {
    return submitConsentCloud(deviceId, matchId, yes);
  }
  return localSubmitConsent(matchId, yes);
}

export async function leaveChat(matchId) {
  const deviceId = await getDeviceId();
  if (isSupabaseConfigured) {
    return leaveChatCloud(deviceId, matchId);
  }
  return localLeaveChat(matchId);
}

export async function updateLine(lineId) {
  const deviceId = await getDeviceId();
  if (isSupabaseConfigured) {
    return updateLineIdCloud(deviceId, lineId);
  }
  return localUpdateLine(lineId);
}

export async function updateIdentityNotes(notes) {
  const deviceId = await getDeviceId();
  if (isSupabaseConfigured) {
    return updateIdentityNotesCloud(deviceId, notes);
  }
  return localUpdateIdentityNotes(notes);
}

export async function updateInterests(interest) {
  const deviceId = await getDeviceId();
  const paid = await isIapPaid();
  if (isSupabaseConfigured) {
    return updateInterestsCloud(deviceId, interest, paid);
  }
  return localUpdateInterests(interest, paid);
}

export async function reportUser(targetId, reason, matchId) {
  const deviceId = await getDeviceId();
  if (isSupabaseConfigured) {
    return reportUserCloud(deviceId, targetId, reason, matchId);
  }
  return localReport(targetId, reason, matchId);
}

export async function refreshPaidFlag() {
  return isIapPaid();
}
