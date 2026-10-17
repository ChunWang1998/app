import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeColors, useItemTone } from '../theme/useTheme';
import { ItemGlyph } from './ItemGlyph';
import { CategoryGlyph } from './CategoryGlyph';
import { CheckIcon } from './Icons';
import { OTHER_ID, OTHER_ICON, categoryName } from '../lib/categories';
import { monogramLetter } from '../lib/suggestIcon';
import { formatLastDoneChip, formatNextShort, formatWeekDue, reminderLabelForDraft } from '../lib/ai/apply';
import { t } from '../i18n';

export function AiIntentCard({
  item,
  categories = [],
  state,
  now = Date.now(),
  onAdd,
  onEdit,
  onUndo,
}) {
  const c = useThemeColors();
  const cat = item.categoryId === OTHER_ID
    ? { id: OTHER_ID, icon: OTHER_ICON }
    : (categories || []).find((x) => x.id === item.categoryId);
  const next = formatNextShort(item, now);
  const last = formatLastDoneChip(item.lastDoneAt, now);
  const addLock = useRef(false);
  if (state !== 'new') addLock.current = false;

  let foot = null;
  if (state === 'new') {
    foot = (
      <View style={styles.acts}>
        <TouchableOpacity testID="ai-edit" onPress={onEdit} style={[styles.btn, { backgroundColor: c.fill }]}>
          <Text style={[styles.btnT, { color: c.label }]}>{t('ai.edit')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="ai-add"
          disabled={addLock.current}
          onPress={() => {
            if (addLock.current) return;
            addLock.current = true;
            onAdd?.();
          }}
          style={[styles.btn, { backgroundColor: c.brand }]}
        >
          <Text style={[styles.btnT, { color: c.onbrand }]}>{t('ai.add')}</Text>
        </TouchableOpacity>
      </View>
    );
  } else if (state === 'added') {
    foot = (
      <View style={styles.added}>
        <CheckIcon color={c.brand} size={15} />
        <Text style={{ color: c.brand, fontFamily: 'BeenAgesRounded-SemiBold', fontSize: 15 }}>{t('ai.added')}</Text>
      </View>
    );
  } else if (state === 'logged') {
    foot = (
      <View style={styles.added}>
        <CheckIcon color={c.brand} size={15} />
        <Text style={{ color: c.brand, fontFamily: 'BeenAgesRounded-SemiBold', fontSize: 15 }}>{t('ai.logged')}</Text>
        {onUndo ? (
          <TouchableOpacity testID="ai-undo" onPress={onUndo} style={{ marginLeft: 'auto', paddingHorizontal: 8 }}>
            <Text style={{ color: c.l2, fontFamily: 'BeenAgesRounded-Regular', fontSize: 15 }}>{t('common.undo')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  } else if (state === 'undone') {
    foot = (
      <View style={styles.added}>
        <Text style={{ color: c.l2, fontFamily: 'BeenAgesRounded-SemiBold', fontSize: 15 }}>{t('ai.undone')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: c.cell }]} testID="ai-card">
      <View style={styles.ch}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[styles.nm, { color: c.label }]}>{item.title}</Text>
          {cat ? (
            <View style={styles.cat}>
              <CategoryGlyph icon={cat.icon} name={categoryName(cat, t)} size={14} glyph={9} />
              <Text style={{ color: c.l2, fontSize: 13, fontFamily: 'BeenAgesRounded-Regular' }}>
                {categoryName(cat, t)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={[styles.kv, { borderTopColor: c.sep }]}>
        <View style={styles.kvCell}>
          <Text style={[styles.k, { color: c.l2 }]}>{t('ai.last')}</Text>
          <Text style={[styles.v, { color: c.label }]}>{last}</Text>
        </View>
        <View style={styles.kvCell}>
          <Text style={[styles.k, { color: c.l2 }]}>{t('edit.reminder')}</Text>
          <Text style={[styles.v, { color: c.label }]}>{reminderLabelForDraft(item)}</Text>
        </View>
        <View style={styles.kvCell}>
          <Text style={[styles.k, { color: c.l2 }]}>{t('ai.next')}</Text>
          <Text style={[styles.v, { color: next.red ? c.red : c.label }]}>{next.text}</Text>
        </View>
      </View>
      {foot}
    </View>
  );
}

function MiniRow({ item, now, first }) {
  const c = useThemeColors();
  const tone = useItemTone(item.icon, item.title);
  const next = formatWeekDue(item, now);
  return (
    <View style={styles.mrow}>
      {!first ? <View style={[styles.mdiv, { borderTopColor: c.sep }]} /> : null}
      <View style={[styles.mgl, { backgroundColor: tone.ac }]}>
        <ItemGlyph kind={item.icon || 'brush'} color={tone.acf} letter={monogramLetter(item.title)} size={18} />
      </View>
      <Text numberOfLines={1} style={[styles.mn, { color: c.label }]}>{item.title}</Text>
      <Text style={{ fontSize: 14, color: next.red ? c.red : c.l2, fontFamily: 'BeenAgesRounded-Regular' }}>
        {next.text}
      </Text>
    </View>
  );
}

export function AiMiniList({ items, now = Date.now() }) {
  const c = useThemeColors();
  return (
    <View style={[styles.mini, { backgroundColor: c.cell }]} testID="ai-week-list">
      {(items || []).map((item, i) => (
        <MiniRow key={item.id || i} item={item} now={now} first={i === 0} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 10, borderRadius: 20, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 12 },
  ch: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gl: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  nm: { fontSize: 18, fontFamily: 'BeenAgesRounded-SemiBold' },
  cat: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  kv: { flexDirection: 'row', marginTop: 14, borderTopWidth: 0.5, paddingTop: 12 },
  kvCell: { flex: 1 },
  k: { fontSize: 13, fontFamily: 'BeenAgesRounded-Regular' },
  v: { fontSize: 16, fontFamily: 'BeenAgesRounded-SemiBold', marginTop: 3 },
  acts: { flexDirection: 'row', gap: 8, marginTop: 14 },
  btn: { flex: 1, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  btnT: { fontSize: 16, fontFamily: 'BeenAgesRounded-SemiBold' },
  added: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, height: 42, paddingHorizontal: 4 },
  mini: { marginTop: 10, borderRadius: 20, overflow: 'hidden' },
  mrow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: 58 },
  mdiv: { position: 'absolute', top: 0, left: 66, right: 0, borderTopWidth: 0.5 },
  mgl: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  mn: { flex: 1, fontSize: 16, fontFamily: 'BeenAgesRounded-SemiBold' },
});
