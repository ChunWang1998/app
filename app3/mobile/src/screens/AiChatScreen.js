import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivities, addActivity, logActivityNow, logActivityOnDay, undoLogAt, FREE_ACTIVITY_LIMIT, getVisibleActivities } from '../data/repository';
import { nowIso } from '../data/models';
import { useThemeColors, useTheme } from '../theme/useTheme';
import { Mascot } from '../components/Mascot';
import { ChevronLeftIcon, PencilIcon } from '../components/Icons';
import { AiComposer } from '../components/AiComposer';
import { AiIntentCard, AiMiniList } from '../components/AiIntentCard';
import { AiEditSheet } from '../components/AiEditSheet';
import { AiVoiceView } from '../components/AiVoiceView';
import { parseIntent } from '../lib/ai/parseIntent';
import {
  draftFromCreate, itemsDueThisWeek, itemsDueToday, resolveItem, sinceCopy,
} from '../lib/ai/apply';
import { supportsOnDeviceSpeech } from '../lib/ai/speech';
import { TOAST_MS } from '../components/UndoToast';
import { OTHER_ID } from '../lib/categories';
import { isProUnlocked } from '../lib/entitlements';
import { getLocale, t } from '../i18n';
import * as Haptics from 'expo-haptics';

const SUGGEST = [
  { title: 'ai.suggestCreateTitle', hint: 'ai.suggestCreateHint', query: 'ai.suggestCreateQuery' },
  { title: 'ai.suggestSinceTitle', hint: 'ai.suggestSinceHint' },
  { title: 'ai.suggestWeekTitle', hint: 'ai.suggestWeekHint' },
  { title: 'ai.suggestLogTitle', hint: 'ai.suggestLogHint' },
];

let seq = 1;
const nid = () => `m${seq++}`;
const PAYWALL_RETRY_MS = 10 * 60 * 1000;

export default function AiChatScreen() {
  const nav = useNavigation();
  const { params } = useRoute();
  const c = useThemeColors();
  const { reminderTime } = useTheme();
  const insets = useSafeAreaInsets();
  const { activities, categories } = useActivities();
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [voice, setVoice] = useState(!!params?.voice && supportsOnDeviceSpeech());
  const [sheet, setSheet] = useState(null);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);
  const fromHomeVoice = useRef(!!params?.voice && supportsOnDeviceSpeech());
  const addingIds = useRef(new Set());
  const undoTimers = useRef([]);
  const pendingPaywall = useRef(null);
  const handleIntentRef = useRef(null);
  const onAddRef = useRef(null);

  useEffect(() => {
    const tmr = setTimeout(() => scrollRef.current?.scrollToEnd?.({ animated: true }), 50);
    return () => clearTimeout(tmr);
  }, [msgs]);

  useEffect(() => () => undoTimers.current.forEach(clearTimeout), []);

  useFocusEffect(useCallback(() => {
    const pending = pendingPaywall.current;
    if (!pending) return undefined;
    pendingPaywall.current = null;
    let live = true;
    (async () => {
      const age = Date.now() - (Number(pending.createdAt) || 0);
      if (age > PAYWALL_RETRY_MS) return;
      const pro = await isProUnlocked();
      if (!live || !pro) return;
      if (pending.kind === 'intent') {
        await handleIntentRef.current?.(pending.intent, pending.replyId, {
          itemId: pending.itemId,
          at: pending.at,
        });
      } else if (pending.kind === 'add') {
        await onAddRef.current?.({ id: pending.msgId, item: pending.item, state: 'new' });
      }
    })();
    return () => { live = false; };
  }, []));

  function patchMsg(id, patch) {
    setMsgs((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  async function handleIntent(intent, replyId, retry) {
    if (intent.type === 'create') {
      const draft = draftFromCreate(intent, { categories, reminderTime });
      patchMsg(replyId, { typing: false, text: t('ai.createIntro'), item: draft, state: 'new', cardOn: true });
      return;
    }
    if (intent.type === 'log') {
      const list = getVisibleActivities();
      const item = retry?.itemId
        ? list.find((a) => a.id === retry.itemId)
        : resolveItem(intent.name, list);
      if (!item) {
        patchMsg(replyId, { typing: false, text: t(retry?.itemId ? 'ai.gone' : 'ai.notFound') });
        return;
      }
      let result;
      const daysAgo = Number(intent.lastDoneDaysAgo);
      const at = retry?.at || (daysAgo > 0 ? intent.lastDoneAt : nowIso());
      try {
        result = daysAgo > 0
          ? await logActivityOnDay(item.id, at)
          : await logActivityNow(item.id, at);
      } catch (e) {
        if (e?.code === 'FREE_LIMIT') {
          pendingPaywall.current = {
            kind: 'intent',
            intent,
            replyId,
            itemId: item.id,
            at,
            createdAt: Date.now(),
          };
          patchMsg(replyId, { typing: false, text: t('ai.limitReached') });
          nav.navigate('Paywall', { reason: e.kind || 'history' });
          return;
        }
        throw e;
      }
      if (result.skipped) {
        patchMsg(replyId, {
          typing: false,
          text: t('ai.logIntro', { name: item.title }),
          item,
          state: 'logged',
          cardOn: true,
        });
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const fresh = { ...item, lastDoneAt: result.loggedAt };
      patchMsg(replyId, {
        typing: false,
        text: t('ai.logIntro', { name: item.title }),
        item: fresh,
        state: 'logged',
        cardOn: true,
        undo: result,
        mood: 'happy',
      });
      const tmr = setTimeout(() => patchMsg(replyId, { undo: null }), TOAST_MS);
      undoTimers.current.push(tmr);
      return;
    }
    if (intent.type === 'query_since') {
      const item = resolveItem(intent.name, activities);
      if (!item) {
        patchMsg(replyId, { typing: false, text: t('ai.notFound') });
        return;
      }
      patchMsg(replyId, {
        typing: false,
        text: sinceCopy(item, Date.now(), getLocale()),
        item,
        state: 'view',
        cardOn: true,
      });
      return;
    }
    if (intent.type === 'query_today') {
      const list = itemsDueToday(activities);
      const n = list.length;
      patchMsg(replyId, {
        typing: false,
        text: n ? t('ai.todayIntro', { n }) : t('ai.todayEmpty'),
        list,
        cardOn: n > 0,
      });
      return;
    }
    if (intent.type === 'query_week') {
      const list = itemsDueThisWeek(activities);
      const n = list.length;
      patchMsg(replyId, {
        typing: false,
        text: n ? t('ai.weekIntro', { n }) : t('ai.weekEmpty'),
        list,
        cardOn: n > 0,
      });
      return;
    }
    patchMsg(replyId, { typing: false, text: t('ai.unknown') });
  }

  async function send(raw) {
    const q = String(raw || text || '').trim();
    if (!q || busy) return;
    setText('');
    setBusy(true);
    const replyId = nid();
    setMsgs((prev) => [
      ...prev,
      { id: nid(), me: true, text: q },
      { id: replyId, typing: true, mood: 'idle' },
    ]);
    try {
      const intent = await parseIntent(q, { locale: getLocale(), items: activities, categories, now: new Date() });
      await handleIntent(intent, replyId);
    } catch {
      patchMsg(replyId, { typing: false, text: t('ai.unknown') });
    } finally {
      setBusy(false);
    }
  }

  async function onAdd(msg) {
    const draft = msg.item;
    if (!draft || msg.state === 'added' || addingIds.current.has(msg.id)) return;
    addingIds.current.add(msg.id);
    patchMsg(msg.id, { state: 'added', text: t('ai.createIntro') });
    try {
      const pro = await isProUnlocked();
      if (!pro && activities.length >= FREE_ACTIVITY_LIMIT) {
        addingIds.current.delete(msg.id);
        pendingPaywall.current = { kind: 'add', msgId: msg.id, item: draft, createdAt: Date.now() };
        patchMsg(msg.id, { state: 'new', text: t('ai.limitReached') });
        nav.navigate('Paywall', { reason: 'items' });
        return;
      }
      await addActivity({
        title: draft.title,
        lastDoneAt: draft.lastDoneAt,
        reminderDays: draft.reminderDays,
        reminderTime: draft.reminderTime || reminderTime,
        ...draft,
        icon: undefined,
        categoryId: draft.categoryId || OTHER_ID,
      });
      if (draft.reminderDays || draft.reminderMode) {
        try {
          const { requestNotificationPermissions } = require('../notifications/reminders');
          await requestNotificationPermissions();
        } catch { /* web / denied */ }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      addingIds.current.delete(msg.id);
      patchMsg(msg.id, { state: 'new' });
      if (e?.code === 'FREE_LIMIT') {
        pendingPaywall.current = { kind: 'add', msgId: msg.id, item: draft, createdAt: Date.now() };
        patchMsg(msg.id, { text: t('ai.limitReached') });
        nav.navigate('Paywall', { reason: e.kind || 'items' });
      }
    }
  }

  handleIntentRef.current = handleIntent;
  onAddRef.current = onAdd;

  async function onUndo(msg) {
    if (!msg.undo?.loggedAt || !msg.item?.id) return;
    await undoLogAt(msg.item.id, msg.undo.loggedAt);
    patchMsg(msg.id, {
      state: 'undone',
      undo: null,
      item: { ...msg.item, lastDoneAt: msg.undo.previousLastDoneAt },
    });
  }

  function onVoiceDone(spoken) {
    setVoice(false);
    fromHomeVoice.current = false;
    if (spoken?.trim()) send(spoken.trim());
  }

  function onVoiceCancel() {
    setVoice(false);
    if (fromHomeVoice.current && !msgs.length) nav.goBack();
    fromHomeVoice.current = false;
  }

  const empty = msgs.length === 0 && !voice;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <View style={styles.cnav}>
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.ib} accessibilityLabel={t('common.back')}>
            <ChevronLeftIcon color={c.brand} />
          </TouchableOpacity>
          <View style={styles.t}>
            <Mascot size={26} mood="idle" />
            <Text style={{ fontFamily: 'BeenAgesRounded-SemiBold', fontSize: 17, color: c.label }}>{t('ai.title')}</Text>
          </View>
          <TouchableOpacity onPress={() => setMsgs([])} style={styles.ib} accessibilityLabel={t('ai.a11yNew')}>
            <PencilIcon color={c.label} />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 150 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.msgs}>
            {msgs.map((m) => (
              m.me ? (
                <View key={m.id} style={styles.me}>
                  <View style={[styles.meB, { backgroundColor: c.bub }]}>
                    <Text style={{ fontSize: 17, lineHeight: 24, color: c.label, fontFamily: 'BeenAgesRounded-Regular' }}>{m.text}</Text>
                  </View>
                </View>
              ) : (
                <View key={m.id} style={styles.ai}>
                  <Mascot size={28} mood={m.mood || 'idle'} />
                  <View style={styles.body}>
                    {m.typing ? (
                      <Dots color={c.l3} />
                    ) : (
                      <>
                        {m.text ? (
                          <Text style={{ fontSize: 17, lineHeight: 26, color: c.label, fontFamily: 'BeenAgesRounded-Regular' }}>{m.text}</Text>
                        ) : null}
                        {m.cardOn && m.list ? <AiMiniList items={m.list} /> : null}
                        {m.cardOn && m.item ? (
                          <AiIntentCard
                            item={m.item}
                            categories={categories}
                            state={m.state}
                            onAdd={() => onAdd(m)}
                            onEdit={() => setSheet(m.id)}
                            onUndo={m.undo ? () => onUndo(m) : undefined}
                          />
                        ) : null}
                      </>
                    )}
                  </View>
                </View>
              )
            ))}
          </View>
        </ScrollView>

        {empty ? (
          <>
            <View style={styles.empty} pointerEvents="none">
              <Mascot size={96} mood="idle" />
            </View>
            <View style={[styles.sug, { bottom: 108 + insets.bottom }]}>
              {SUGGEST.map((s) => (
                <TouchableOpacity
                  key={s.title}
                  testID={`ai-sug-${s.title}`}
                  onPress={() => send(t(s.query || s.title))}
                  style={[styles.sg, { backgroundColor: c.cell, borderColor: c.sep }]}
                >
                  <Text style={{ fontFamily: 'BeenAgesRounded-SemiBold', fontSize: 15, color: c.label }}>{t(s.title)}</Text>
                  <Text style={{ fontSize: 13, color: c.l2, fontFamily: 'BeenAgesRounded-Regular' }}>{t(s.hint)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}

        <View style={[styles.dock, { paddingBottom: 10 + insets.bottom, backgroundColor: c.bg }]}>
          <AiComposer
            value={text}
            onChangeText={setText}
            onSend={() => send()}
            onMic={() => { if (supportsOnDeviceSpeech()) setVoice(true); }}
            autoFocus={!params?.voice}
          />
        </View>

        {voice ? (
          <AiVoiceView onCancel={onVoiceCancel} onDone={onVoiceDone} />
        ) : null}

        <AiEditSheet
          visible={!!sheet}
          item={msgs.find((m) => m.id === sheet)?.item}
          onClose={() => setSheet(null)}
          onSave={(next) => {
            patchMsg(sheet, { item: next });
            setSheet(null);
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function Dots({ color }) {
  return (
    <View style={styles.dots}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={[styles.dot, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cnav: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  ib: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  t: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  msgs: { paddingTop: 8 },
  me: { flexDirection: 'row', justifyContent: 'flex-end', paddingVertical: 6, paddingHorizontal: 16 },
  meB: { maxWidth: '76%', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 15 },
  ai: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, alignItems: 'flex-start' },
  body: { flex: 1, minWidth: 0 },
  empty: { position: 'absolute', left: 0, right: 0, top: 250, alignItems: 'center' },
  sug: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sg: { width: '48%', flexGrow: 1, borderRadius: 18, paddingVertical: 11, paddingHorizontal: 14, borderWidth: 1 },
  dock: { paddingHorizontal: 12, paddingTop: 10 },
  dots: { flexDirection: 'row', gap: 5, paddingVertical: 9 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
