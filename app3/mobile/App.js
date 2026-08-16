import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
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
import { locateCoords, expoReverseCity } from './src/lib/location';
import {
  reverseCityDistrict,
  fetchDistrictsForCity,
  cityFromRaw,
} from './src/lib/districts';
import {
  loadSession,
  loadProfile,
  loadFounderCount,
  registerWithProfile,
  saveProfile,
  markPaid,
  listOwners,
  listConnects,
  sendConnect,
  setConnectStatus,
  demoAccept,
  hasValidSub,
  completeGuideConnect,
  loadTour,
  saveTour,
  listGatherings,
  joinGathering,
} from './src/lib/store';
import LandingScreen from './src/screens/LandingScreen';
import LocateGateScreen from './src/screens/LocateGateScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import OwnerDetailScreen from './src/screens/OwnerDetailScreen';
import MeScreen from './src/screens/MeScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import SubscribeScreen from './src/screens/SubscribeScreen';
import ChatScreen from './src/screens/ChatScreen';
import TabBar from './src/components/TabBar';
import TourSheet from './src/components/TourSheet';
import ConnectReminder from './src/components/ConnectReminder';

export default function App() {
  const [started, setStarted] = useState(false);
  const [locateStatus, setLocateStatus] = useState('locating');
  const [locateError, setLocateError] = useState('');
  const [city, setCity] = useState('');
  const [guessedDistrict, setGuessedDistrict] = useState('');
  const [districts, setDistricts] = useState([]);

  const [tab, setTab] = useState('explore');
  const [overlay, setOverlay] = useState(null);
  const [ownerId, setOwnerId] = useState(null);
  const [chatId, setChatId] = useState(null);

  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [founderCount, setFounderCount] = useState(0);
  const [owners, setOwners] = useState([]);
  const [connects, setConnects] = useState([]);
  const [gatherings, setGatherings] = useState([]);

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
  }, []);

  const runLocate = useCallback(async () => {
    setLocateStatus('locating');
    setLocateError('');
    try {
      const coords = await locateCoords();
      let cityRaw = '';
      let districtRaw = '';
      try {
        const nlsc = await reverseCityDistrict(coords);
        cityRaw = nlsc.cityRaw;
        districtRaw = nlsc.districtRaw;
      } catch {
        const expo = await expoReverseCity(coords);
        cityRaw = expo?.cityRaw || '';
        districtRaw = expo?.districtRaw || '';
      }
      const nextCity = cityFromRaw(cityRaw) || cityFromRaw(districtRaw);
      if (!nextCity || !isTrialCity(nextCity)) {
        setCity(cityRaw || nextCity || '');
        setLocateStatus('blocked');
        return;
      }
      const towns = await fetchDistrictsForCity(nextCity);
      if (!towns.length) {
        setLocateError('行政區 API 沒有回傳資料');
        setLocateStatus('error');
        return;
      }
      setCity(nextCity);
      setDistricts(towns);
      setGuessedDistrict(towns.includes(districtRaw) ? districtRaw : '');
      setLocateStatus('ready');
      await reload(nextCity);
      const tour = await loadTour();
      if (tour?.step && !tour.done) setTourStep(tour.step);
    } catch (e) {
      if (e.code === 'denied') {
        setLocateStatus('denied');
        return;
      }
      setLocateError(e.message || String(e));
      setLocateStatus('error');
    }
  }, [reload]);

  useEffect(() => {
    if (!started) return;
    runLocate();
  }, [started, runLocate]);

  const ownersById = useMemo(() => {
    const map = {};
    for (const o of owners) map[o.id] = o;
    if (profile && session) map[session.id] = { ...profile, id: session.id };
    return map;
  }, [owners, profile, session]);

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

  const activeConnect = connects.find(
    (c) =>
      (c.fromId === session?.id && c.toId === ownerId) ||
      (c.toId === session?.id && c.fromId === ownerId),
  );
  const chatConnect = connects.find((c) => c.id === chatId);

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
        onRetry={runLocate}
      />
    );
  } else if (overlay === 'subscribe') {
    body = (
      <SubscribeScreen
        founderCount={founderCount}
        onBack={() => setOverlay(null)}
        onDemoPay={async () => {
          const s = await markPaid();
          if (!s) {
            Alert.alert('請先到「我的」填手機號並建立狗檔案');
            setOverlay(null);
            setTab('me');
            return;
          }
          setSession(s);
          setOverlay(null);
        }}
      />
    );
  } else if (overlay === 'edit') {
    body = (
      <EditProfileScreen
        city={city}
        districts={districts}
        initial={profile}
        registerMode={Boolean(pendingPhone) && !session}
        onBack={() => {
          setPendingPhone('');
          setOverlay(null);
        }}
        onSave={async (next) => {
          try {
            if (pendingPhone && !session) {
              const result = await registerWithProfile(pendingPhone, next);
              setPendingPhone('');
              setSession(result.session);
              setProfile(result.profile);
              setFounderCount(result.founderCount);
              await reload(city);
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
            await reload(city);
            setOverlay(null);
            Alert.alert('已儲存', '檔案會出現在目前縣市的清單');
          } catch (e) {
            if (e.code === 'invalid') {
              Alert.alert('手機號格式不對');
              return;
            }
            Alert.alert('無法註冊', e.message || String(e));
          }
        }}
      />
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
            Alert.alert('請先到「我的」填手機號並建立狗檔案');
            setOverlay(null);
            setTab('me');
            return;
          }
          if (!profile) {
            Alert.alert('請先完成狗檔案');
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
            setOverlay('chat');
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
        onBack={() => setOverlay(null)}
        onRefreshOwners={() => reload(city)}
      />
    );
  } else {
    if (session && !profile && overlay == null) {
      body = (
        <EditProfileScreen
          city={city}
          districts={districts}
          initial={null}
          registerMode
          onBack={() => {}}
          onSave={async (next) => {
            const saved = await saveProfile(next);
            setProfile(saved);
            await reload(city);
            Alert.alert('已完成', '狗檔案已建立，註冊完成。');
          }}
        />
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
                gatherings={gatherings}
                onOpenOwner={openOwner}
                onJoinGathering={(g) => {
                  if (!session || !profile) {
                    Alert.alert('請先完成註冊', '填手機號並建立狗檔案後才能報名。');
                    setTab('me');
                    return;
                  }
                  if (!subscribed) {
                    setOverlay('subscribe');
                    return;
                  }
                  Alert.alert(
                    '報名確認',
                    `${g.park}\n${g.dateLabel} ${g.time}\n主揪：${g.hostName}\n報名費 NT$${g.fee} 請當場繳給主揪，平台不經手。\n人數上限 ${g.cap} 人。`,
                    [
                      { text: '取消', style: 'cancel' },
                      {
                        text: '確認報名',
                        onPress: async () => {
                          try {
                            const next = await joinGathering(g.id, session.id);
                            setGatherings(next);
                            Alert.alert('已報名', '請準時到場，向主揪繳費。');
                          } catch (e) {
                            if (e.code === 'full') Alert.alert('已額滿');
                            else Alert.alert('無法報名', e.message || String(e));
                          }
                        },
                      },
                    ],
                  );
                }}
              />
            ) : (
              <MeScreen
                session={session}
                profile={profile}
                founderCount={founderCount}
                connects={connects}
                ownersById={ownersById}
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
                onOpenChat={(id) => {
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
                onDemoAccept={async (id) => {
                  await demoAccept(id);
                  await reload(city);
                  const row = connects.find((c) => c.id === id);
                  const peerId = row?.fromId === session?.id ? row?.toId : row?.fromId;
                  showReminder(ownersById[peerId]?.dogName);
                }}
              />
            )}
          </LinearGradient>
          <TabBar tab={tab} onChange={setTab} />
        </LinearGradient>
      );
    }
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
      setTab('explore');
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
