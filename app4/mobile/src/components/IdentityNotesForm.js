import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';
import {
  labelForIdentity,
  MAX_IDENTITY_NOTE,
  noteForIdentity,
} from '../data/identities';

/**
 * One text field per own identity (max 50 chars each).
 * @param {string[]} ownIds
 * @param {Record<string, string>} notes
 * @param {(next: Record<string, string>) => void} onChange
 */
export default function IdentityNotesForm({ ownIds = [], notes = {}, onChange }) {
  const setNote = (id, text) => {
    onChange({ ...notes, [id]: text });
  };

  if (!ownIds.length) {
    return <Text style={styles.empty}>請先選擇至少一個身份</Text>;
  }

  return (
    <View style={styles.wrap}>
      {ownIds.map((id) => {
        const value = noteForIdentity(notes, id);
        return (
          <View key={id} style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{labelForIdentity(id)}</Text>
              <Text style={styles.count}>
                {value.length}/{MAX_IDENTITY_NOTE}
              </Text>
            </View>
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={(text) => setNote(id, text)}
              maxLength={MAX_IDENTITY_NOTE}
              multiline
            />
          </View>
        );
      })}
      <Text style={styles.hint}>
        簡短描述你在這個身份下的經歷（每則 50 字內）。請勿填寫全名或完整公司／學校名稱。
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  field: { gap: 6 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { fontSize: 15, fontWeight: '600', color: colors.ink },
  count: { fontSize: 12, color: colors.muted },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.row,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
    backgroundColor: '#FAFCFA',
    minHeight: 72,
    textAlignVertical: 'top',
  },
  hint: { fontSize: 12, lineHeight: 18, color: colors.muted },
  empty: { color: colors.muted, fontSize: 14 },
});
