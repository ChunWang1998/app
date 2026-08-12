import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { alignZhuyin } from '../lib/zhuyin';

/**
 * Renders sutra text; when showZhuyin, each Han char gets bopomofo above it.
 */
export default function ZhuyinText({ text, zhuyin, showZhuyin, fontSize, lineHeight }) {
  if (!showZhuyin || !zhuyin?.length) {
    return (
      <Text style={{ fontSize, lineHeight, color: colors.ink, fontWeight: '500' }}>
        {text}
      </Text>
    );
  }

  const chars = alignZhuyin(text, zhuyin);
  const zySize = Math.max(11, Math.round(fontSize * 0.36));

  return (
    <View style={[styles.row, { rowGap: Math.round(fontSize * 0.35) }]}>
      {chars.map((item, idx) => (
        <View
          key={`${idx}-${item.c}`}
          style={[styles.cell, { minWidth: Math.max(fontSize * 0.95, zySize * 1.6) }]}
        >
          <Text style={[styles.zy, { fontSize: zySize, height: zySize + 2 }]} numberOfLines={1}>
            {item.zy || ' '}
          </Text>
          <Text style={{ fontSize, color: colors.ink, fontWeight: '500', lineHeight: fontSize * 1.2 }}>
            {item.c}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  cell: {
    alignItems: 'center',
    marginHorizontal: 1,
  },
  zy: {
    color: colors.muted,
    fontWeight: '500',
    textAlign: 'center',
  },
});
