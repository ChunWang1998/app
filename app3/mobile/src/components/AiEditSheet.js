import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors, useItemTone } from '../theme/useTheme';
import { ItemGlyph } from './ItemGlyph';
import { monogramLetter } from '../lib/suggestIcon';
import { lastDoneIsoFromDaysAgo } from '../lib/ai/relative';
import { configFromChipDays, reminderFieldsFromConfig, chipDaysFromConfig, reminderConfigFromActivity } from '../lib/reminderSchedule';
import { t } from '../i18n';

const LAST = [
  { d: 0, key: 'common.today' },
  { d: 1, key: 'common.yesterday' },
  { d: 7, key: 'date.weekAgo' },
];

const REM = [
  { d: 7, key: 'reminder.weekly' },
  { d: 14, key: 'reminder.twoWeeks' },
  { d: 30, key: 'reminder.monthly' },
  { d: 90, key: 'reminder.threeMonths' },
];

function daysAgoOf(iso, now) {
  if (!iso) return null;
  const a = new Date(iso);
  const b = new Date(now);
  const startA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const startB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((startB - startA) / 864e5);
}

export function AiEditSheet({ visible, item, onClose, onSave, now = Date.now() }) {
  const c = useThemeColors();
  const insets = useSafeAreaInsets();
  const tone = useItemTone(item?.icon, item?.title);
  const [lastDays, setLastDays] = useState(0);
  const [remDays, setRemDays] = useState(7);

  useEffect(() => {
    if (!visible || !item) return;
    setLastDays(daysAgoOf(item.lastDoneAt, now) ?? 0);
    const v = chipDaysFromConfig(reminderConfigFromActivity(item));
    setRemDays(typeof v === 'number' ? v : (item.reminderDays || 7));
  }, [visible, item, now]);

  if (!item) return null;

  function save() {
    const lastDoneAt = lastDoneIsoFromDaysAgo(lastDays, now);
    const fields = reminderFieldsFromConfig(configFromChipDays(remDays, item));
    onSave({ ...item, lastDoneAt, reminderDays: fields.reminderDays, ...fields });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <Pressable style={[styles.dim, { backgroundColor: c.dim }]} onPress={onClose} />
        <View style={[styles.bs, { backgroundColor: c.sheetbg, paddingBottom: 34 + insets.bottom }]}>
          <View style={[styles.grab, { backgroundColor: c.l3 }]} />
          <View style={styles.bsn}>
            <TouchableOpacity onPress={onClose} style={styles.side}>
              <Text style={{ color: c.brand, fontSize: 17, fontFamily: 'BeenAgesRounded-Regular' }}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={{ fontFamily: 'BeenAgesRounded-SemiBold', fontSize: 17, color: c.label }}>{t('ai.edit')}</Text>
            <TouchableOpacity testID="ai-sheet-save" onPress={save} style={styles.side}>
              <Text style={{ color: c.brand, fontSize: 17, fontFamily: 'BeenAgesRounded-SemiBold', textAlign: 'right' }}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.eg, { backgroundColor: c.cell }]}>
            <View style={styles.er}>
              <View style={[styles.gl, { backgroundColor: tone.ac }]}>
                <ItemGlyph kind={item.icon || 'brush'} color={tone.acf} letter={monogramLetter(item.title)} size={18} />
              </View>
              <Text style={{ fontFamily: 'BeenAgesRounded-SemiBold', fontSize: 20, color: c.label, flex: 1 }} numberOfLines={1}>
                {item.title}
              </Text>
            </View>
          </View>
          <Text style={[styles.lab, { color: c.l2 }]}>{t('edit.last')}</Text>
          <View style={styles.qc}>
            {LAST.map((o) => {
              const on = lastDays === o.d;
              return (
                <TouchableOpacity
                  key={o.d}
                  testID={`ai-last-${o.d}`}
                  onPress={() => setLastDays(o.d)}
                  style={[styles.q, { backgroundColor: on ? c.brand : c.cell }]}
                >
                  <Text style={{ color: on ? c.onbrand : c.label, fontFamily: on ? 'BeenAgesRounded-Bold' : 'BeenAgesRounded-Regular', fontSize: 15 }}>
                    {t(o.key)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.lab, { color: c.l2 }]}>{t('edit.reminder')}</Text>
          <View style={styles.qc}>
            {REM.map((o) => {
              const on = remDays === o.d;
              return (
                <TouchableOpacity
                  key={o.d}
                  testID={`ai-rem-${o.d}`}
                  onPress={() => setRemDays(o.d)}
                  style={[styles.q, { backgroundColor: on ? c.brand : c.cell }]}
                >
                  <Text style={{ color: on ? c.onbrand : c.label, fontFamily: on ? 'BeenAgesRounded-Bold' : 'BeenAgesRounded-Regular', fontSize: 15 }}>
                    {t(o.key)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end' },
  dim: { ...StyleSheet.absoluteFillObject },
  bs: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10 },
  grab: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 8 },
  bsn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 44, marginBottom: 8 },
  side: { minWidth: 56 },
  eg: { marginHorizontal: 16, borderRadius: 18, overflow: 'hidden' },
  er: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 60, paddingHorizontal: 16 },
  gl: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  lab: { fontSize: 15, fontFamily: 'BeenAgesRounded-Regular', paddingHorizontal: 20, paddingTop: 16 },
  qc: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingTop: 10 },
  q: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 17 },
});
