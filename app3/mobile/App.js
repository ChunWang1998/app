import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { screenGradient } from './src/theme';
import { sizesTwoLevelsApart, TAIWAN_CITIES } from './src/data/constants';
import { fetchDistrictsForCity } from './src/lib/districts';
import { displayNameForOwner, primaryDog } from './src/lib/dogs';
import {
  loadSession,
  loadProfile,
  registerWithProfile,
  restoreAccount,
  saveProfile,
  listOwners,
  listConnects,
  sendConnect,
  setConnectStatus,
  hasValidSub,
  markSubscribedLocally,
  listGatherings,
  joinGathering,
  createGathering,
  likeGatheringHost,
  disconnectConnect,
  deleteAccount,
  reportOwner,
  blockOwner,
  listUnreadConnectIds,
} from './src/lib/store';
import { ensureNotifyPermission } from './src/lib/notify';
import { registerPushToken } from './src/lib/push';
import { AppPrefsProvider, usePrefs } from './src/context/AppPrefs';
import LandingScreen from './src/screens/LandingScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import GatheringsScreen from './src/screens/GatheringsScreen';
import OwnerDetailScreen from './src/screens/OwnerDetailScreen';
import MeScreen from './src/screens/MeScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import SubscribeScreen from './src/screens/SubscribeScreen';
import ChatScreen from './src/screens/ChatScreen';
import CreateGatheringScreen from './src/screens/CreateGatheringScreen';
import GatheringDetailScreen from './src/screens/GatheringDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import TabBar from './src/components/TabBar';
import TabSwipe from './src/components/TabSwipe';
import ConnectReminder from './src/components/ConnectReminder';

function AppInner() {
  const { theme, colors, t } = usePrefs();
  const grad = screenGradient(theme);

  const [started, setStarted] = useState(false);
  const [districtsByCity, setDistrictsByCity] = useState({});
  const [ready, setReady] = useState(false);

  const [tab, setTab] = useState('explore');
  const [overlay, setOverlay] = useState(null);
  const [ownerId, setOwnerId] = useState(null);
  const [focusDogId, setFocusDogId] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [chatFrom, setChatFrom] = useState('profile');
  const [gatheringId, setGatheringId] = useState(null);
  const [gatheringFrom, setGatheringFrom] = useState('profile');

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [owners, setOwners] = useState([]);
  const [connects, setConnects] = useState([]);
  const [gatherings, setGatherings] = useState([]);
  const [myGatherings, setMyGatherings] = useState([]);
  const [unreadConnectIds, setUnreadConnectIds] = useState([]);

  const [pendingPhone, setPendingPhone] = useState('');
  const [reminder, setReminder] = useState({ visible: false, name: '' });

  const subscribed = hasValidSub(session);

  const reload = useCallback(async () => {
    const [s, p] = await Promise.all([loadSession(), loadProfile()]);
    const [o, cs, gs] = await Promise.all([
      listOwners(undefined, s),
      listConnects(s),
      listGatherings(null, s?.id, s),
    ]);
    setSession(s);
    setProfile(p);
    setOwners(o);
    setConnects(cs);
    setGatherings(gs);
    setMyGatherings(gs.filter((g) => g.iJoined || g.iHost));
    try {
      setUnreadConnectIds(await listUnreadConnectIds(cs, s?.id));
    } catch {
      setUnreadConnectIds([]);
    }
  }, []);

  const refreshUnread = useCallback(async () => {
    try {
      const s = session || (await loadSession());
      const cs = connects.length ? connects : await listConnects(s);
      setUnreadConnectIds(await listUnreadConnectIds(cs, s?.id));
    } catch {
      // ignore
    }
  }, [session, connects]);

  useEffect(() => {
    if (!started || !ready || !session?.id) return;
    refreshUnread();
    const t = setInterval(refreshUnread, 12000);
    return () => clearInterval(t);
  }, [started, ready, session?.id, refreshUnread]);

  const ensureDistricts = useCallback(
    async (city) => {
      if (!city || !TAIWAN_CITIES.includes(city)) return [];
      if (districtsByCity[city]?.length) return districtsByCity[city];
      try {
        const towns = await fetchDistrictsForCity(city);
        setDistrictsByCity((prev) => ({ ...prev, [city]: towns }));
        return towns;
      } catch {
        return [];
      }
    },
    [districtsByCity],
  );

  useEffect(() => {
    if (!started) return;
    ensureNotifyPermission();
    (async () => {
      await reload();
      setReady(true);
      const s = await loadSession();
      if (s?.loginKey) {
        registerPushToken(s.loginKey);
      }
    })();
  }, [started, reload]);

  useEffect(() => {
    if (!started || !ready) return undefined;
    const timer = setInterval(() => {
      reload();
    }, 12000);
    return () => clearInterval(timer);
  }, [started, ready, reload]);

  const ownersById = useMemo(() => {
    const map = {};
    for (const o of owners) map[o.id] = o;
    if (profile && session) map[session.id] = { ...profile, id: session.id };
    return map;
  }, [owners, profile, session]);

  const openProfile = () => setOverlay('profile');

  const needAccount = (action) => {
    Alert.alert('請先完成註冊', `到右上角個人頁填手機號並建立汪汪檔案後才能${action}。`);
    setOverlay('profile');
  };

  const openOwner = (id, dogId = null) => {
    if (!subscribed) {
      setOverlay('subscribe');
      return;
    }
    setOwnerId(id);
    setFocusDogId(dogId);
    setOverlay('detail');
  };

  const showReminder = (name) => {
    setReminder({ visible: true, name: name || '' });
  };

  const acceptConnect = async (id) => {
    if (!subscribed) {
      setOverlay('subscribe');
      return;
    }
    try {
      await setConnectStatus(id, 'accepted');
      await reload();
      const row = connects.find((c) => c.id === id);
      const peerId = row?.fromId === session?.id ? row?.toId : row?.fromId;
      showReminder(displayNameForOwner(ownersById[peerId]));
    } catch (e) {
      if (e.code === 'subscribe') setOverlay('subscribe');
      else Alert.alert('無法接受', e.message || String(e));
    }
  };

  const declineConnect = async (id) => {
    await setConnectStatus(id, 'declined');
    await reload();
  };

  const doSendConnect = async (owner) => {
    const send = async () => {
      try {
        await sendConnect(session.id, ownerId);
        await reload();
        Alert.alert(t('connectSent'), t('connectSentBody'));
      } catch (e) {
        if (e.code === 'subscribe') setOverlay('subscribe');
        else Alert.alert('無法 Connect', e.message || String(e));
      }
    };

    const afterSizeCheck = async () => {
      if (owner && owner.subscribed === false) {
        Alert.alert(t('connectUnpaidWarnTitle'), t('connectUnpaidWarnBody'), [
          { text: t('cancel'), style: 'cancel' },
          { text: t('stillConnect'), onPress: send },
        ]);
        return;
      }
      await send();
    };

    const myDog = primaryDog(profile);
    const theirSize =
      (owner?.dogs || []).find((d) => d.id === focusDogId)?.size || owner?.size;
    if (sizesTwoLevelsApart(myDog?.size || profile.size, theirSize)) {
      Alert.alert(
        '體型差較大',
        '大型與小型狗第一次請平行走、保持距離，不要互相撲。仍要 Connect 嗎？',
        [
          { text: t('cancel'), style: 'cancel' },
          { text: t('stillConnect'), onPress: afterSizeCheck },
        ],
      );
      return;
    }
    await afterSizeCheck();
  };

  const joinOne = (g) => {
    if (g.full && !g.iJoined) {
      Alert.alert('額滿', '這場聚會已經額滿，無法報名。');
      return;
    }
    if (!session || !profile) {
      needAccount('報名');
      return;
    }
    if (!subscribed) {
      setOverlay('subscribe');
      return;
    }
    Alert.alert(
      '報名確認',
      `${g.name}\n${g.city || ''}\n${g.dateLabel}\n${g.place}\n類型：${g.type}\n收費：${
        g.fee === 0 ? '免費' : `NT$${g.fee}`
      }（主辦者標示，平台不經手）\n報名後到個人頁點進去加入 LINE 群組。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確認報名',
          onPress: async () => {
            try {
              await joinGathering(g.id, session.id);
              await reload();
              Alert.alert('已報名', '到右上角個人頁可看到參加的聚會與 LINE 群組邀請。');
            } catch (e) {
              if (e.code === 'ended') Alert.alert('活動已結束');
              else if (e.code === 'host') Alert.alert('主辦者不必報名');
              else if (e.code === 'full') Alert.alert('額滿', '這場聚會已經額滿。');
              else Alert.alert('無法報名', e.message || String(e));
            }
          },
        },
      ],
    );
  };

  const openGathering = (g, from = 'profile') => {
    setGatheringId(g.id);
    setGatheringFrom(from);
    setOverlay('gatheringDetail');
  };

  const activeConnect = connects.find(
    (c) =>
      (c.fromId === session?.id && c.toId === ownerId) ||
      (c.toId === session?.id && c.fromId === ownerId),
  );
  const chatConnect = connects.find((c) => c.id === chatId);
  const activeGathering =
    gatherings.find((g) => g.id === gatheringId) ||
    myGatherings.find((g) => g.id === gatheringId);

  let body = null;
  if (!started) {
    body = <LandingScreen onStart={() => setStarted(true)} />;
  } else if (!ready) {
    body = (
      <LinearGradient colors={grad} style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={{ marginTop: 12, color: colors.muted, fontSize: 14 }}>
            {t('loading')}
          </Text>
        </View>
      </LinearGradient>
    );
  } else if (overlay === 'subscribe') {
    body = (
      <SubscribeScreen
        onBack={() => setOverlay(null)}
        onUnlocked={async () => {
          const s = await markSubscribedLocally();
          if (s) {
            setSession(s);
            if (s.loginKey) registerPushToken(s.loginKey);
          }
          await reload();
        }}
      />
    );
  } else if (overlay === 'edit') {
    body = (
      <View style={{ flex: 1 }}>
        <EditProfileScreen
          initial={profile}
          registerMode={Boolean(pendingPhone) && !session}
          onBack={() => {
            setPendingPhone('');
            setOverlay('profile');
          }}
          onCityChange={(city) => {
            ensureDistricts(city);
          }}
          onSave={async (next) => {
            try {
              if (pendingPhone && !session) {
                const result = await registerWithProfile(pendingPhone, next);
                setPendingPhone('');
                setSession(result.session);
                setProfile(result.profile);
                await ensureDistricts(result.profile?.city || next.city);
                await reload();
                if (result.session?.loginKey) {
                  registerPushToken(result.session.loginKey);
                }
                setOverlay(null);
                setTab('explore');
                if (result.already) {
                  Alert.alert('已還原', '這支號碼已註冊，已載入原檔案。');
                }
                return;
              }
              const saved = await saveProfile(next);
              setProfile(saved);
              await ensureDistricts(next.city);
              await reload();
              setOverlay('profile');
              Alert.alert('已儲存', '檔案會出現在探索清單');
            } catch (e) {
              if (e.code === 'invalid') {
                Alert.alert('手機號格式不對');
                return;
              }
              if (e.code === 'full') {
                Alert.alert('暫時無法註冊', '請稍後再試或聯絡支援。');
                return;
              }
              if (e.code === 'city') {
                Alert.alert('請選有效的台灣縣市');
                return;
              }
              Alert.alert('無法註冊', e.message || String(e));
            }
          }}
        />
      </View>
    );
  } else if (overlay === 'detail') {
    const owner = ownersById[ownerId];
    body = (
      <OwnerDetailScreen
        owner={owner}
        focusDogId={focusDogId}
        subscribed={subscribed}
        isMe={session?.id === ownerId}
        connect={activeConnect}
        tourHint={null}
        onBack={() => setOverlay(null)}
        onSubscribe={() => setOverlay('subscribe')}
        onConnect={async () => {
          if (!session) {
            needAccount('Connect');
            return;
          }
          if (!profile) {
            Alert.alert('請先完成汪汪檔案');
            setOverlay('edit');
            return;
          }
          await doSendConnect(owner);
        }}
        onOpenChat={() => {
          if (activeConnect) {
            setChatId(activeConnect.id);
            setChatFrom('detail');
            setOverlay('chat');
          }
        }}
        onReport={async (reason) => {
          try {
            await reportOwner(ownerId, reason);
            Alert.alert('已收到檢舉', '我們會在後台查看。嚴重時會暫停對方 Connect。');
          } catch (e) {
            Alert.alert('無法檢舉', e.message || String(e));
          }
        }}
        onBlock={async () => {
          try {
            await blockOwner(ownerId);
            setOverlay(null);
            await reload();
            Alert.alert('已封鎖', '對方不會再出現在你的清單。');
          } catch (e) {
            Alert.alert('無法封鎖', e.message || String(e));
          }
        }}
      />
    );
  } else if (overlay === 'chat' && chatConnect) {
    const peerId =
      chatConnect.fromId === session?.id ? chatConnect.toId : chatConnect.fromId;
    body = (
      <ChatScreen
        connect={chatConnect}
        meId={session?.id}
        peerName={displayNameForOwner(ownersById[peerId]) || '對方'}
        peerPlaces={ownersById[peerId]?.places || []}
        onBack={() => setOverlay(chatFrom === 'detail' ? 'detail' : 'profile')}
        onRefreshOwners={() => reload()}
        onUnreadChange={refreshUnread}
      />
    );
  } else if (overlay === 'createGathering') {
    body = (
      <LinearGradient colors={grad} style={{ flex: 1 }}>
        <CreateGatheringScreen
          defaultCity={profile?.city || TAIWAN_CITIES[0]}
          onBack={() => {
            setOverlay(null);
            setTab('gatherings');
          }}
          onSave={async (payload) => {
            try {
              await createGathering(payload, {
                id: session.id,
                city: payload.city || profile.city,
                dogName: primaryDog(profile)?.dogName || profile.dogName,
                hostName: primaryDog(profile)?.dogName || profile.dogName,
              });
              await reload();
              setOverlay(null);
              setTab('gatherings');
              Alert.alert('已建立', '聚會已出現在聚會頁。報名者會在個人頁看到 LINE 群組。');
            } catch (e) {
              if (e.code === 'line') Alert.alert('請附上 LINE 群組連結');
              else if (e.code === 'already') {
                Alert.alert('已有聚會', '同一時間只能創辦一場聚會，等目前這場結束後再辦。');
              } else Alert.alert('無法建立', '請檢查名字、日期、地點、縣市、類型與收費。');
            }
          }}
        />
      </LinearGradient>
    );
  } else if (overlay === 'gatheringDetail') {
    body = (
      <LinearGradient colors={grad} style={{ flex: 1 }}>
        <GatheringDetailScreen
          gathering={activeGathering}
          onBack={() => setOverlay(gatheringFrom === 'gatherings' ? null : 'profile')}
          onLike={async () => {
            try {
              await likeGatheringHost(gatheringId, session.id);
              await reload();
              Alert.alert('已按讚', '主辦人的汪汪大隊長分數 +1');
            } catch (e) {
              if (e.code === 'already') Alert.alert('這一場已經按過了');
              else if (e.code === 'early') Alert.alert('活動結束後才能按讚');
              else Alert.alert('無法按讚', e.message || String(e));
            }
          }}
        />
      </LinearGradient>
    );
  } else if (overlay === 'profile') {
    body = (
      <LinearGradient colors={grad} style={{ flex: 1 }}>
        <MeScreen
          session={session}
          profile={profile}
          connects={connects}
          ownersById={ownersById}
          myGatherings={myGatherings}
          unreadConnectIds={unreadConnectIds}
          onBack={() => setOverlay(null)}
          onRegister={async (phone) => {
            try {
              const restored = await restoreAccount(phone);
              if (restored) {
                setSession(restored.session);
                setProfile(restored.profile);
                await ensureDistricts(restored.profile?.city);
                await reload();
                if (restored.session?.loginKey) {
                  registerPushToken(restored.session.loginKey);
                }
                setOverlay(null);
                Alert.alert('已還原', '同一支號碼的汪汪檔案已從雲端載入。');
                return;
              }
              setPendingPhone(phone);
              setOverlay('edit');
            } catch (e) {
              if (e.code === 'invalid') Alert.alert('手機號格式不對');
              else Alert.alert('無法登入', e.message || String(e));
            }
          }}
          onCreateProfile={() => {
            setOverlay('edit');
          }}
          onSubscribe={() => setOverlay('subscribe')}
          onOpenChat={async (id) => {
            setChatFrom('profile');
            setChatId(id);
            setOverlay('chat');
          }}
          onAccept={acceptConnect}
          onDecline={declineConnect}
          onOpenGathering={openGathering}
          onDisconnect={async (id) => {
            await disconnectConnect(id, session.id);
            await reload();
          }}
          onDeleteAccount={async () => {
            try {
              await deleteAccount();
              setSession(null);
              setProfile(null);
              setConnects([]);
              setOverlay(null);
              await reload();
              Alert.alert('帳號已刪除');
            } catch (e) {
              Alert.alert('無法刪除', e.message || String(e));
            }
          }}
        />
      </LinearGradient>
    );
  } else if (session && !profile && overlay == null) {
    body = (
      <View style={{ flex: 1 }}>
        <EditProfileScreen
          initial={null}
          registerMode
          onBack={() => {}}
          onCityChange={(city) => ensureDistricts(city)}
          onSave={async (next) => {
            const saved = await saveProfile(next);
            setProfile(saved);
            await ensureDistricts(next.city);
            await reload();
            Alert.alert('已完成', '汪汪檔案已建立，註冊完成。');
          }}
        />
      </View>
    );
  } else {
    body = (
      <LinearGradient colors={grad} style={{ flex: 1 }}>
        <TabSwipe tab={tab} onChange={setTab}>
          <LinearGradient colors={grad} style={{ flex: 1 }}>
            {tab === 'explore' ? (
              <ExploreScreen
                districtsByCity={districtsByCity}
                onNeedDistricts={ensureDistricts}
                owners={owners}
                profile={profile}
                session={session}
                subscribed={subscribed}
                connects={connects}
                ownersById={ownersById}
                onOpenOwner={openOwner}
                onProfile={openProfile}
                onAccept={acceptConnect}
                onDecline={declineConnect}
                onNeedRegister={() => setOverlay('profile')}
                onNeedSubscribe={() => setOverlay('subscribe')}
                hasUnreadChat={unreadConnectIds.length > 0}
              />
            ) : tab === 'gatherings' ? (
              <GatheringsScreen
                gatherings={gatherings}
                profile={profile}
                hostingActive={myGatherings.some((g) => g.iHost && !g.ended)}
                hasUnreadChat={unreadConnectIds.length > 0}
                onProfile={openProfile}
                onJoin={joinOne}
                onOpen={(g) => openGathering(g, 'gatherings')}
                onCreateGathering={() => {
                  if (!session || !profile) {
                    needAccount('創辦聚會');
                    return;
                  }
                  if (!subscribed) {
                    setOverlay('subscribe');
                    return;
                  }
                  if (myGatherings.some((g) => g.iHost && !g.ended)) {
                    Alert.alert(
                      '已有聚會',
                      '同一時間只能創辦一場聚會，等目前這場結束後再辦。',
                    );
                    return;
                  }
                  setOverlay('createGathering');
                }}
              />
            ) : (
              <SettingsScreen
                profile={profile}
                onProfile={openProfile}
                hasUnreadChat={unreadConnectIds.length > 0}
              />
            )}
          </LinearGradient>
        </TabSwipe>
        <TabBar tab={tab} onChange={setTab} />
      </LinearGradient>
    );
  }

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      {body}
      <ConnectReminder
        visible={reminder.visible}
        peerName={reminder.name}
        onClose={() => {
          setReminder({ visible: false, name: '' });
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppPrefsProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AppInner />
        </GestureHandlerRootView>
      </AppPrefsProvider>
    </SafeAreaProvider>
  );
}
