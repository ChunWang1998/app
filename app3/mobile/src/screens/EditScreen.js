import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActivities, addActivity, updateActivity, softDeleteActivity, FREE_ACTIVITY_LIMIT } from '../data/repository';
import { useThemeColors, useItemTone, useTheme } from '../theme/useTheme';
import { ItemGlyph } from '../components/ItemGlyph';
import { ChevronRightIcon } from '../components/Icons';
import { isProUnlocked } from '../lib/entitlements';
import { DateChips } from '../components/DateChips';
import { CategoryPicker } from '../components/CategoryPicker';
import { CategoryGlyph } from '../components/CategoryGlyph';
import { OTHER_ID, OTHER_ICON, matchCategory, categoryName } from '../lib/categories';
import { ReminderChips } from '../components/ReminderChips';
import { suggestReminderDays } from '../lib/suggestReminder';
import { suggestIcon, monogramLetter } from '../lib/suggestIcon';
import { t } from '../i18n';
import { clearDraftReminder, subscribeDraftReminder } from '../data/reminderDraft';
import {
  chipDaysFromConfig,
  configFromChipDays,
  formatReminderLabel,
  reminderConfigFromActivity,
  reminderFieldsFromConfig,
} from '../lib/reminderSchedule';

const PICKER = ['brush', 'drop', 'eye', 'pill', 'leaf', 'bed', 'scissors', 'car', 'paw', 'plug'];

export default function EditScreen() {
  const nav = useNavigation();
  const { params } = useRoute();
  const { activities, categories } = useActivities();
  const current = activities.find((a) => a.id === params?.id);
  const c = useThemeColors();
  const { reminderTime: defaultTime } = useTheme();
  const insets = useSafeAreaInsets();
  const isNew = !current;
  const [title, setTitle] = useState(current?.title || '');
  const [icon, setIcon] = useState(current?.icon || (isNew ? 'mono' : 'brush'));
  const [iconManual, setIconManual] = useState(!isNew);
  const [notes, setNotes] = useState(current?.notes || '');
  const [lastDoneAt, setLastDoneAt] = useState(() => (isNew ? new Date().toISOString() : current?.lastDoneAt || null));
  const [reminderCfg, setReminderCfg] = useState(() => reminderConfigFromActivity({ reminderTime: defaultTime }));
  const [reminderManual, setReminderManual] = useState(false);
  const [categoryId, setCategoryId] = useState(current?.categoryId || null);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  // New items: auto-match from the name until the user picks one.
  const shownCategory = categoryId || (title.trim() ? matchCategory(title, categories) : null);
  const catObj = shownCategory === OTHER_ID ? { id: OTHER_ID, icon: OTHER_ICON } : categories.find((x) => x.id === shownCategory);

  const remLabel = current ? formatReminderLabel(current) : formatReminderLabel(reminderCfg);
  const tone = useItemTone(icon, title);
  const chipValue = chipDaysFromConfig(reminderCfg);

  useEffect(() => {
    if (!isNew) return undefined;
    clearDraftReminder();
    return subscribeDraftReminder((fields) => {
      if (!fields) return;
      setReminderManual(true);
      setReminderCfg(reminderConfigFromActivity(fields));
    });
  }, [isNew]);

  function onTitle(text) {
    setTitle(text);
    if (!iconManual) setIcon(suggestIcon(text));
    if (isNew && !reminderManual) {
      const days = suggestReminderDays(text);
      setReminderCfg(configFromChipDays(days, { ...reminderCfg, time: defaultTime }));
    }
  }

  function openMore() {
    nav.navigate('Reminder', {
      draft: true,
      title: title.trim() || t('edit.newItem'),
      lastDoneAt,
      createdAt: new Date().toISOString(),
      value: reminderFieldsFromConfig(reminderCfg),
    });
  }

  async function save() {
    if (busy) return;
    const trimmed = title.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      if (current) {
        const patch = { title: trimmed, icon, notes, ...(categoryId ? { categoryId } : {}) };
        if (lastDoneAt !== current.lastDoneAt) {
          const rest = (current.history || []).filter((e) => e.at !== current.lastDoneAt);
          patch.history = lastDoneAt ? [{ at: lastDoneAt }, ...rest] : rest;
        }
        await updateActivity(current.id, patch);
      } else {
        const pro = await isProUnlocked();
        if (!pro && activities.length >= FREE_ACTIVITY_LIMIT) {
          nav.replace('Paywall');
          return;
        }
        try {
          const reminderFields = reminderFieldsFromConfig(reminderCfg);
          const reminderDays = reminderFields.reminderDays;
          await addActivity({
            title: trimmed,
            icon,
            notes,
            lastDoneAt,
            reminderDays,
            reminderTime: reminderFields.reminderTime || defaultTime,
            ...reminderFields,
            categoryId: shownCategory || OTHER_ID,
          });
          if (reminderFields.reminderMode || reminderFields.reminderDays) {
            try {
              const { requestNotificationPermissions } = require('../notifications/reminders');
              await requestNotificationPermissions();
            } catch {
              // web / denied: the setting is saved; scheduling skips without permission
            }
          }
        } catch (e) {
          if (e?.code === 'FREE_LIMIT') {
            nav.replace('Paywall');
            return;
          }
          throw e;
        }
      }
      nav.goBack();
    } catch (e) {
      Alert.alert(t('common.fail'), String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  function del() {
    if (!current) return nav.goBack();
    Alert.alert(current.title, '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await softDeleteActivity(current.id);
          nav.reset({ index: 0, routes: [{ name: 'Home' }] });
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.sheetbg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.nav, { paddingTop: 8 }]}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.navSide}>
          <Text style={{ color: c.brand, fontSize: 17, fontFamily: 'BeenAgesRounded-Regular' }}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: c.label }]}>{isNew ? t('edit.newItem') : t('edit.edit')}</Text>
        <TouchableOpacity onPress={save} style={styles.navSideRight} disabled={busy || !title.trim()}>
          <Text style={{ color: title.trim() ? c.brand : c.l3, fontSize: 17, fontFamily: 'BeenAgesRounded-SemiBold' }}>
            {isNew ? t('edit.add') : t('common.done')}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}>
        <View style={[styles.grp, { backgroundColor: c.cell }]}>
          <View style={styles.row}>
            <View style={[styles.preview, { backgroundColor: tone.ac }]}>
              <ItemGlyph kind={icon} color={tone.acf} letter={monogramLetter(title) || title} />
            </View>
            <TextInput
              value={title}
              onChangeText={onTitle}
              placeholder={t('edit.placeholder')}
              placeholderTextColor={c.l3}
              style={[styles.input, { color: c.label }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]}
              autoFocus={isNew}
              testID="edit-title"
            />
          </View>
        </View>
        {catObj ? (
          <View style={styles.catRow}>
            {!categoryId ? <Text style={[styles.auto, { color: c.l3 }]}>{t('category.auto')}</Text> : null}
            <TouchableOpacity testID="cat-pill" onPress={() => setPicker(true)} style={[styles.catPill, { backgroundColor: c.cell }]}>
              <CategoryGlyph icon={catObj.icon} name={categoryName(catObj, t)} size={22} glyph={13} />
              <Text style={{ color: c.label, fontFamily: 'BeenAgesRounded-Regular', fontSize: 15 }}>{categoryName(catObj, t)}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <CategoryPicker
          visible={picker}
          categories={categories}
          value={shownCategory}
          onPick={(id) => { setCategoryId(id); setPicker(false); }}
          onClose={() => setPicker(false)}
        />
        <View style={styles.icp}>
          {PICKER.map((k) => (
            <IconBtn key={k} k={k} on={icon === k} onPress={() => { setIconManual(true); setIcon(k); }} idle={c.cell} dim={c.l2} />
          ))}
        </View>

        <View style={[styles.grp, { backgroundColor: c.cell, marginTop: 18 }]}>
          <View style={[styles.rowLine, { paddingTop: 12 }]}>
            <Text style={[styles.lab, styles.secLab, { color: c.label }]}>{t('edit.last')}</Text>
            <DateChips value={lastDoneAt} onChange={setLastDoneAt} />
          </View>
          {isNew ? (
            <View style={{ paddingTop: 12 }}>
              <Text style={[styles.lab, styles.secLab, { color: c.label }]}>{t('edit.reminder')}</Text>
              <ReminderChips
                value={chipValue}
                onChange={(d) => {
                  setReminderManual(true);
                  setReminderCfg(configFromChipDays(d, { ...reminderCfg, time: defaultTime }));
                }}
                onMore={openMore}
              />
            </View>
          ) : (
            <TouchableOpacity style={styles.row} onPress={() => nav.navigate('Reminder', { id: current.id })}>
              <Text style={[styles.lab, { color: c.label }]}>{t('edit.reminder')}</Text>
              <Text style={{ color: c.l2, fontFamily: 'BeenAgesRounded-Regular', marginLeft: 'auto', marginRight: 6 }}>
                {remLabel}
              </Text>
              <ChevronRightIcon color={c.l3} />
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.grp, { backgroundColor: c.cell, marginTop: 18, minHeight: 96 }]}>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t('edit.notes')}
            placeholderTextColor={c.l3}
            multiline
            style={[styles.notes, { color: c.label }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]}
          />
        </View>

        {!!current && (
          <View style={[styles.grp, { backgroundColor: c.cell, marginTop: 24 }]}>
            <TouchableOpacity onPress={del} style={[styles.row, { justifyContent: 'center' }]}>
              <Text style={{ color: c.red, fontSize: 17, fontFamily: 'BeenAgesRounded-Regular' }}>{t('common.delete')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function IconBtn({ k, on, onPress, idle, dim }) {
  const tone = useItemTone(k);
  return (
    <View style={styles.icCell}>
      <TouchableOpacity
        onPress={onPress}
        style={[styles.icBtn, { backgroundColor: on ? tone.ac : idle }]}
        accessibilityLabel={k}
      >
        <ItemGlyph kind={k} color={on ? tone.acf : dim} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  navSide: { minWidth: 64, height: 44, justifyContent: 'center' },
  navSideRight: { minWidth: 64, height: 44, justifyContent: 'center', alignItems: 'flex-end' },
  title: { fontFamily: 'BeenAgesRounded-SemiBold', fontSize: 17 },
  grp: { marginHorizontal: 16, borderRadius: 18, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingHorizontal: 16, gap: 10 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(46,41,37,0.09)' },
  input: { flex: 1, fontSize: 22, fontFamily: 'BeenAgesRounded-SemiBold', paddingVertical: 14 },
  lab: { fontSize: 17, fontFamily: 'BeenAgesRounded-Regular', minWidth: 44 },
  secLab: { paddingHorizontal: 16 },
  catRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 16, paddingTop: 10 },
  auto: { fontSize: 13, fontFamily: 'BeenAgesRounded-Regular' },
  catPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingLeft: 4, paddingRight: 12, borderRadius: 16 },
  notes: {
    minHeight: 96,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 17,
    fontFamily: 'BeenAgesRounded-Regular',
    textAlignVertical: 'top',
  },
  preview: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  // 5 per row, wraps: never clips on narrow screens.
  icp: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, paddingTop: 14, paddingHorizontal: 16 },
  icCell: { width: '20%', alignItems: 'center' },
  icBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
