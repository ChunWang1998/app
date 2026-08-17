import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from './src/theme';
import { isTrialCity } from './src/data/constants';
import {
  GUIDE_REPLY_ID,
  GUIDE_TRY_ID,
  getGuide,
  isGuideId,
} from './src/data/globalGuides';
import { fetchDistrictsForCity } from './src/lib/districts';
import {
  loadSession,
  loadProfile,
  loadFounderCount,
  registerWithProfile,
  saveProfile,
  listOwners,
  listConnects,
  sendConnect,
  setConnectStatus,
  hasValidSub,
  completeGuideConnect,
  loadTour,
  saveTour,
  listGatherings,
  listMyGatherings,
  joinGathering,
  createGathering,
  likeGatheringHost,
  disconnectConnect,
  loadSelectedCity,
  saveSelectedCity,
  maybeSendDemoInvite,
  deleteAccount,
  reportOwner,
  blockOwner,
} from './src/lib/store';
import { ensureNotifyPermission, notifyUser } from './src/lib/notify';
import LandingScreen from './src/screens/LandingScreen';
import LocateGateScreen from './src/screens/LocateGateScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import GatheringsScreen from './src/screens/GatheringsScreen';
import OwnerDetailScreen from './src/screens/OwnerDetailScreen';
import MeScreen from './src/screens/MeScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import SubscribeScreen from './src/screens/SubscribeScreen';
import ChatScreen from './src/screens/ChatScreen';
import CreateGatheringScreen from './src/screens/CreateGatheringScreen';
import GatheringDetailScreen from './src/screens/GatheringDetailScreen';
import TabBar from './src/components/TabBar';
import TourSheet from './src/components/TourSheet';
import ConnectReminder from './src/components/ConnectReminder';

export default function App() {
  const [started, setStarted] = useState(false);
  const [locateStatus, setLocateStatus] = useState('pick');
  const [locateError, setLocateError] = useState('');
  const [city, setCity] = useState('');
  const [guessedDistrict, setGuessedDistrict] = useState('');
  const [districts, setDistricts] = useState([]);

  const [tab, setTab] = useState('explore');
  const [overlay, setOverlay] = useState(null);
  const [ownerId, setOwnerId] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [chatFrom, setChatFrom] = useState('profile');
  const [gatheringId, setGatheringId] = useState(null);
  const [gatheringFrom, setGatheringFrom] = useState('profile');

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [founderCount, setFounderCount] = useState(0);
  const [owners, setOwners] = useState([]);
  const [connects, setConnects] = useState([]);
  const [gatherings, setGatherings] = useState([]);
  const [myGatherings, setMyGatherings] = useState([]);

  const [pendingPhone, setPendingPhone] = useState('');
  const [tourStep, setTourStep] = useState(null);
  const [reminder, setReminder] = useState({ visible: false, name: '' });
  const [afterReminder, setAfterReminder] = useState(null);

  const subscribed = hasValidSub(session);

  const reload = useCallback(async (forCity) => {
    if (!forCity) return;
    const [s, p, fc, o, cs] = await Promise.all([
      loadSession(),
      loadProfile(),
      loadFounderCount(),
      listOwners(forCity),
      listConnects(),
    ]);
    setSession(s);
    setProfile(p);
    setFounderCount(fc);
    setOwners(o);
    setConnects(cs);
    setGatherings(await listGatherings(forCity, s?.id));
    setMyGatherings(await listMyGatherings(forCity, s?.id));
  }, []);

  const applyCity = useCallback(async (nextCity, { showGate = false } = {}) => {
    if (!isTrialCity(nextCity)) return false;
    if (showGate) {
      setLocateStatus('loading');
      setLocateError('');
    }
    try {
      const towns = await fetchDistrictsForCity(nextCity);
      if (!towns.length) {
        if (showGate) {
          setLocateError('行政區沒有回傳資料');
          setLocateStatus('error');
        } else {
          Alert.alert('行政區載入失敗', '請確認網路後重試。');
        }
        return false;
      }
      await saveSelectedCity(nextCity);
      setCity(nextCity);
      setDistricts(towns);
      setGuessedDistrict('');
      if (showGate) setLocateStatus('ready');
      await reload(nextCity);
      const s = await loadSession();
      if (s?.id) {
        setTimeout(async () => {
          const demo = await maybeSendDemoInvite(s.id, nextCity);
          if (!demo?.peer) return;
          await reload(nextCity);
          await notifyUser({
            title: '新的 Connect 邀請',
            body: `${demo.peer.dogName} 想跟你 Connect`,
          });
        }, 3500);
      }
      const tour = await loadTour();
      if (tour?.step && !tour.done) setTourStep(tour.step);
      return true;
    } catch (e) {
      if (showGate) {
        setLocateError(e.message || String(e));
        setLocateStatus('error');
      } else {
        Alert.alert('行政區載入失敗', e.message || String(e));
      }
      return false;
    }
  }, [reload]);

  useEffect(() => {
    if (!started) return;
    ensureNotifyPermission();
    setLocateStatus('loading');
    (async () => {
      const saved = await loadSelectedCity();
      if (saved) {
        applyCity(saved, { showGate: true });
      } else {
        setLocateStatus('pick');
      }
    })();
  }, [started, applyCity]);

  useEffect(() => {
    if (!started || locateStatus !== 'ready' || !city) return undefined;
    const t = setInterval(() => {
      reload(city);
    }, 12000);
    return () => clearInterval(t);
  }, [started, locateStatus, city, reload]);

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

  const openOwner = (id) => {
    if (!subscribed) {
      setOverlay('subscribe');
      return;
    }
    setOwnerId(id);
    setOverlay('detail');
  };

  const showReminder = (name, nextTour) => {
    setReminder({ visible: true, name: name || '' });
    setAfterReminder(nextTour || null);
  };

  const finishGuideConnect = async (connectRow, guideId) => {
    const guide = getGuide(guideId);
    const run = async () => {
      await completeGuideConnect(connectRow.id, guideId);
      await reload(city);
      await notifyUser({
        title: 'Connect 已接受',
        body: `${guide?.dogName || '對方'} 接受了你的 Connect`,
      });
      for (const text of guide?.messages || []) {
        await notifyUser({
          title: `${guide.dogName} 傳了訊息`,
          body: text,
        });
      }
      const next =
        tourStep === 'connecting1' && guideId === GUIDE_REPLY_ID
          ? 'guide2'
          : tourStep === 'connecting2' && guideId === GUIDE_TRY_ID
            ? 'gathering'
            : null;
      showReminder(guide?.dogName, next);
    };
    if (guide?.delayReplyMs) {
      setTimeout(run, guide.delayReplyMs);
    } else {
      await run();
    }
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
      `${g.name}\n${g.dateLabel}\n${g.place}\n類型：${g.type}\n收費：${
        g.fee === 0 ? '免費' : `NT$${g.fee}`
      }（主辦者標示，平台不經手）\n報名後到個人頁點進去加入 LINE 群組。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確認報名',
          onPress: async () => {
            try {
              await joinGathering(g.id, session.id);
              await reload(city);
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

  const tourHint =
    overlay === 'detail' && tourStep === 'connecting1' && ownerId === GUIDE_REPLY_ID
      ? '教學：按 Connect。團團一定會回，並傳訊息給你。'
      : overlay === 'detail' && tourStep === 'connecting2' && ownerId === GUIDE_TRY_ID
        ? '教學：再試著 Connect 可可。可可會回覆並主動傳訊息。'
        : null;

  let body = null;
  if (!started) {
    body = <LandingScreen onStart={() => setStarted(true)} />;
  } else if (locateStatus !== 'ready') {
    body = (
      <LocateGateScreen
        status={locateStatus}
        city={city}
        error={locateError}
        onPick={(nextCity) => applyCity(nextCity, { showGate: true })}
        onRetry={() =>
          city
            ? applyCity(city, { showGate: true })
            : setLocateStatus('pick')
        }
      />
    );
  } else if (overlay === 'subscribe') {
    body = (
      <SubscribeScreen
        founderCount={founderCount}
        onBack={() => setOverlay(null)}
      />
    );
  } else if (overlay === 'edit') {
    body = (
      <View style={{ flex: 1 }}>
      <EditProfileScreen
        city={city}
        districts={districts}
        initial={profile}
        registerMode={Boolean(pendingPhone) && !session}
        onBack={() => {
          setPendingPhone('');
          setOverlay('profile');
        }}
        onSave={async (next) => {
          try {
            if (pendingPhone && !session) {
              const result = await registerWithProfile(pendingPhone, next);
              setPendingPhone('');
              setSession(result.session);
              setProfile(result.profile);
              setFounderCount(result.founderCount);
              await applyCity(next.city || city);
              setOverlay(null);
              setTab('explore');
              if (result.session.subscription === 'founder') {
                await saveTour({ done: false, step: 'welcome' });
                setTourStep('welcome');
              } else {
                Alert.alert('白名單已滿', '檔案已建立。未訂閱只能看清單，Connect 請先訂閱。');
                setOverlay('subscribe');
              }
              return;
            }
            const saved = await saveProfile(next);
            setProfile(saved);
            await applyCity(next.city || city);
            setOverlay('profile');
            Alert.alert('已儲存', '檔案會出現在你選擇的縣市清單');
          } catch (e) {
            if (e.code === 'invalid') {
              Alert.alert('手機號格式不對');
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
        subscribed={subscribed}
        isMe={session?.id === ownerId}
        connect={activeConnect}
        tourHint={tourHint}
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
          const row = await sendConnect(session.id, ownerId);
          await reload(city);
          if (isGuideId(ownerId) && row.status === 'pending') {
            await finishGuideConnect(row, ownerId);
          } else if (!isGuideId(ownerId)) {
            Alert.alert('已送出', '對方需在個人頁接受後才能聊天');
          }
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
            await reload(city);
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
        peerName={ownersById[peerId]?.dogName || '對方'}
        onBack={() => setOverlay(chatFrom === 'detail' ? 'detail' : 'profile')}
        onRefreshOwners={() => reload(city)}
      />
    );
  } else if (overlay === 'createGathering') {
    body = (
      <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={{ flex: 1 }}>
        <CreateGatheringScreen
        onBack={() => {
          setOverlay(null);
          setTab('gatherings');
        }}
        onSave={async (payload) => {
          try {
            await createGathering(payload, {
              id: session.id,
              city,
              dogName: profile.dogName,
            });
            await reload(city);
            setOverlay(null);
            setTab('gatherings');
            Alert.alert('已建立', '聚會已出現在本市聚會頁。報名者會在個人頁看到 LINE 群組。');
          } catch (e) {
            if (e.code === 'line') Alert.alert('請附上 LINE 群組連結');
            else if (e.code === 'already') {
              Alert.alert('已有聚會', '同一時間只能創辦一場聚會，等目前這場結束後再辦。');
            } else Alert.alert('無法建立', '請檢查名字、日期、地點、類型與收費。');
          }
        }}
      />
      </LinearGradient>
    );
  } else if (overlay === 'gatheringDetail') {
    body = (
      <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={{ flex: 1 }}>
        <GatheringDetailScreen
        gathering={activeGathering}
        onBack={() => setOverlay(gatheringFrom === 'gatherings' ? null : 'profile')}
        onLike={async () => {
          try {
            await likeGatheringHost(gatheringId, session.id);
            await reload(city);
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
      <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={{ flex: 1 }}>
        <MeScreen
          session={session}
          profile={profile}
          founderCount={founderCount}
          connects={connects}
          ownersById={ownersById}
          myGatherings={myGatherings}
          onBack={() => setOverlay(null)}
          onRegister={async (phone) => {
            setPendingPhone(phone);
            setOverlay('edit');
          }}
          onCreateProfile={() => {
            if (!subscribed) {
              setOverlay('subscribe');
              return;
            }
            setOverlay('edit');
          }}
          onSubscribe={() => setOverlay('subscribe')}
          onOpenChat={async (id) => {
            setChatFrom('profile');
            setChatId(id);
            setOverlay('chat');
          }}
          onAccept={async (id) => {
            if (!subscribed) {
              setOverlay('subscribe');
              return;
            }
            await setConnectStatus(id, 'accepted');
            await reload(city);
            const row = connects.find((c) => c.id === id);
            const peerId = row?.fromId === session?.id ? row?.toId : row?.fromId;
            showReminder(ownersById[peerId]?.dogName);
          }}
          onDecline={async (id) => {
            await setConnectStatus(id, 'declined');
            await reload(city);
          }}
          onOpenGathering={openGathering}
          onDisconnect={async (id) => {
            await disconnectConnect(id, session.id);
            await reload(city);
          }}
          onDeleteAccount={async () => {
            try {
              await deleteAccount();
              setSession(null);
              setProfile(null);
              setConnects([]);
              setOverlay(null);
              await reload(city);
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
        city={city}
        districts={districts}
        initial={null}
        registerMode
        onBack={() => {}}
        onSave={async (next) => {
          const saved = await saveProfile(next);
          setProfile(saved);
          await applyCity(next.city || city);
          Alert.alert('已完成', '汪汪檔案已建立，註冊完成。');
        }}
      />
      </View>
    );
  } else {
    body = (
      <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={{ flex: 1 }}>
        <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={{ flex: 1 }}>
          {tab === 'explore' ? (
            <ExploreScreen
              city={city}
              districts={districts}
              guessedDistrict={guessedDistrict}
              owners={owners}
              profile={profile}
              onOpenOwner={openOwner}
              onProfile={openProfile}
              onChangeCity={(nextCity) => applyCity(nextCity)}
            />
          ) : (
            <GatheringsScreen
              city={city}
              gatherings={gatherings}
              profile={profile}
              hostingActive={myGatherings.some((g) => g.iHost && !g.ended)}
              onProfile={openProfile}
              onJoin={joinOne}
              onOpen={(g) => openGathering(g, 'gatherings')}
              onChangeCity={(nextCity) => applyCity(nextCity)}
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
          )}
        </LinearGradient>
        <TabBar tab={tab} onChange={setTab} />
      </LinearGradient>
    );
  }

  const onTourNext = async () => {
    if (tourStep === 'welcome') {
      await saveTour({ done: false, step: 'connecting1' });
      setTourStep('connecting1');
      openOwner(GUIDE_REPLY_ID);
      return;
    }
    if (tourStep === 'guide2') {
      await saveTour({ done: false, step: 'connecting2' });
      setTourStep('connecting2');
      openOwner(GUIDE_TRY_ID);
      return;
    }
    if (tourStep === 'gathering') {
      await saveTour({ done: true, step: null });
      setTourStep(null);
      setOverlay(null);
      setTab('gatherings');
    }
  };

  const onTourSkip = async () => {
    await saveTour({ done: true, step: null });
    setTourStep(null);
  };

  const sheetStep =
    tourStep === 'welcome' || tourStep === 'guide2' || tourStep === 'gathering'
      ? tourStep
      : null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="dark" />
        {body}
        {sheetStep && overlay !== 'edit' ? (
          <TourSheet step={sheetStep} onNext={onTourNext} onSkip={onTourSkip} />
        ) : null}
        <ConnectReminder
          visible={reminder.visible}
          peerName={reminder.name}
          onClose={async () => {
            setReminder({ visible: false, name: '' });
            const next = afterReminder;
            setAfterReminder(null);
            if (next) {
              await saveTour({ done: false, step: next });
              setTourStep(next);
              setOverlay(null);
              setTab('explore');
            }
          }}
        />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
