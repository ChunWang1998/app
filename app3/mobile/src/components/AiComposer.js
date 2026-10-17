import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useThemeColors } from '../theme/useTheme';
import { MicIcon, SendUpIcon } from './Icons';
import { t } from '../i18n';

export function AiComposer({
  value,
  onChangeText,
  onOpen,
  onSend,
  onMic,
  editable = true,
  autoFocus = false,
  inputRef,
}) {
  const c = useThemeColors();
  const has = String(value || '').length > 0;
  return (
    <View style={[styles.cmp, { backgroundColor: c.cell, borderColor: c.sep }]} testID="ai-composer">
      {editable ? (
        <TextInput
          ref={inputRef}
          testID="ai-input"
          value={value}
          onChangeText={onChangeText}
          placeholder={t('ai.placeholder')}
          placeholderTextColor={c.l3}
          style={[styles.in, { color: c.label }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]}
          multiline
          autoFocus={autoFocus}
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={() => { if (has) onSend?.(); }}
        />
      ) : (
        <TouchableOpacity style={styles.tap} onPress={onOpen} activeOpacity={0.7} testID="ai-open">
          <Text style={[styles.ph, { color: c.l3 }]}>{t('ai.placeholder')}</Text>
        </TouchableOpacity>
      )}
      {has ? (
        <TouchableOpacity
          testID="ai-send"
          onPress={onSend}
          style={[styles.rb, { backgroundColor: c.brand }]}
          accessibilityLabel={t('ai.a11ySend')}
        >
          <SendUpIcon color={c.onbrand} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          testID="ai-mic"
          onPress={onMic}
          style={styles.rb}
          accessibilityLabel={t('ai.a11yMic')}
        >
          <MicIcon color={c.l2} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cmp: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    minHeight: 52,
    borderRadius: 26,
    borderWidth: 1,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  in: {
    flex: 1,
    fontSize: 17,
    lineHeight: 24,
    paddingVertical: 8,
    minHeight: 40,
    fontFamily: 'BeenAgesRounded-Regular',
    maxHeight: 120,
  },
  tap: { flex: 1, minHeight: 40, justifyContent: 'center' },
  ph: { fontSize: 17, fontFamily: 'BeenAgesRounded-Regular' },
  rb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
