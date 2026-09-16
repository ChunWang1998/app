import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from './src/theme';
import {
  bootstrap,
  completeOnboarding,
  fetchUsage,
  runDailyMatch,
  fetchMatches,
  fetchMessages,
  sendChatMessage,
  submitContinueConsent,
  leaveChat,
  updateLine,
  updateInterests,
  reportUser,
  refreshPaidFlag,
} from './src/lib/store';
import { restoreSubscription } from './src/lib/iap';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';
import MatchResultScreen from './src/screens/MatchResultScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SubscribeScreen from './src/screens/SubscribeScreen';
import EditInterestsScreen from './src/screens/EditInterestsScreen';
import EditLineScreen from './src/screens/EditLineScreen';

export default function App() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [paid, setPaid] = useState(false);
  const [usage, setUsage] = useState(null);
  const [screen, setScreen] = useState('home');
  const [matchPayload, setMatchPayload] = useState(null);
  const [matching, setMatching] = useState(false);

  const reloadUsage = useCallback(async () => {
    try {
      const u = await fetchUsage();
      if (u?.ok) setUsage(u);
    } catch {
      // ignore until registered
    }
  }, []);

  const reload = useCallback(async () => {
    const boot = await bootstrap();
    setPaid(Boolean(boot.paid));
    setProfile(boot.profile || null);
    if (boot.profile) {
      try {
        const u = await fetchUsage();
        if (u?.ok) setUsage(u);
      } catch {
        // ignore
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await restoreSubscription().catch(() => null);
      } catch {
        // ignore
      }
      await reload();
    })();
  }, [reload]);

  const onOnboard = async (payload) => {
    const p = await completeOnboarding(payload);
    setProfile(p);
    await reloadUsage();
    setScreen('home');
  };

  const openChat = (payload) => {
    setMatchPayload(payload);
    setScreen('chat');
  };

  const onMatch = async () => {
    setMatching(true);
    try {
      const result = await runDailyMatch();
      if (!result?.ok) {
        if (result?.code === 'quota') {
          Alert.alert(
            '今日次數已用完',
            paid ? '請明天再試' : '升級 Premium 可每日配對 5 次',
            paid
              ? [{ text: '好' }]
              : [
                  { text: '稍後' },
                  { text: '升級', onPress: () => setScreen('subscribe') },
                ],
          );
        } else if (result?.code === 'no_candidates') {
          Alert.alert('目前沒有可配對的對象', '請稍後再試');
        } else {
          Alert.alert('配對失敗', result?.code || '未知錯誤');
        }
        await reloadUsage();
        return;
      }
      setUsage({
        ok: true,
        used: result.used,
        limit: result.limit,
        remaining: result.remaining,
      });
      openChat(result);
    } catch (e) {
      Alert.alert('配對失敗', String(e?.message || e));
    } finally {
      setMatching(false);
    }
  };

  if (!ready) {
    return (
      <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </LinearGradient>
    );
  }

  let body = null;
  if (!profile) {
    body = <OnboardingScreen onComplete={onOnboard} />;
  } else if (screen === 'chat' && matchPayload) {
    body = (
      <ChatScreen
        matchId={matchPayload.match_id}
        meId={profile.id}
        initialOther={matchPayload.other}
        loadMessages={fetchMessages}
        sendMessage={sendChatMessage}
        submitConsent={submitContinueConsent}
        leaveChat={leaveChat}
        onReport={reportUser}
        onBack={() => {
          setMatchPayload(null);
          setScreen('home');
        }}
        onEnded={() => {
          setMatchPayload(null);
          setScreen('home');
        }}
        onLineRevealed={(data) => {
          setMatchPayload({
            match_id: matchPayload.match_id,
            me: data.me || profile,
            other: data.other,
            status: 'line_revealed',
          });
          setScreen('match');
        }}
      />
    );
  } else if (screen === 'match' && matchPayload) {
    body = (
      <MatchResultScreen
        me={matchPayload.me || profile}
        other={matchPayload.other}
        matchId={matchPayload.match_id}
        onBack={() => {
          setMatchPayload(null);
          setScreen('home');
        }}
        onReport={reportUser}
      />
    );
  } else if (screen === 'history') {
    body = (
      <HistoryScreen
        loadMatches={fetchMatches}
        onBack={() => setScreen('home')}
        onOpenMatch={(item) => {
          if (item.status === 'line_revealed') {
            setMatchPayload({
              match_id: item.match_id,
              me: { ...profile, line_id: item.me_line_id || profile.line_id },
              other: item.other,
              status: 'line_revealed',
            });
            setScreen('match');
            return;
          }
          openChat({
            match_id: item.match_id,
            other: item.other,
            status: item.status,
            message_count: item.message_count,
          });
        }}
        onReport={reportUser}
      />
    );
  } else if (screen === 'subscribe') {
    body = (
      <SubscribeScreen
        onBack={() => setScreen('home')}
        onUnlocked={async () => {
          setPaid(await refreshPaidFlag());
          await reloadUsage();
        }}
      />
    );
  } else if (screen === 'interests') {
    body = (
      <EditInterestsScreen
        profile={profile}
        paid={paid}
        onSave={async (interest) => {
          const result = await updateInterests(interest);
          if (result?.ok && result.profile) setProfile(result.profile);
          return result;
        }}
        onBack={() => setScreen('home')}
        onSubscribe={() => setScreen('subscribe')}
      />
    );
  } else if (screen === 'line') {
    body = (
      <EditLineScreen
        profile={profile}
        onSave={async (line) => {
          const result = await updateLine(line);
          if (result?.ok && result.profile) setProfile(result.profile);
          return result;
        }}
        onBack={() => setScreen('home')}
      />
    );
  } else {
    body = (
      <HomeScreen
        profile={profile}
        paid={paid}
        usage={usage}
        matching={matching}
        onMatch={onMatch}
        onHistory={() => setScreen('history')}
        onSubscribe={() => setScreen('subscribe')}
        onEditInterests={() => setScreen('interests')}
        onEditLine={() => setScreen('line')}
      />
    );
  }

  return (
    <GestureHandlerRootView style={styles.fill}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        {body}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
