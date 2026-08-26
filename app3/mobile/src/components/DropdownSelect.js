import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

/**
 * Simple dropdown: tap field → modal list of options.
 * options: [{ value: string, label: string }]
 */
export default function DropdownSelect({
  label,
  value,
  options,
  onChange,
  placeholder = '請選擇',
  disabled = false,
  style,
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const display = selected?.label || placeholder;

  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.field, disabled && styles.fieldDisabled]}
        onPress={() => {
          if (!disabled) setOpen(true);
        }}
        activeOpacity={0.8}
        disabled={disabled}
      >
        <Text
          style={[styles.value, !selected && styles.placeholder]}
          numberOfLines={1}
        >
          {display}
        </Text>
        <Ionicons
          name="chevron-down"
          size={18}
          color={disabled ? colors.muted : colors.brandDeep}
        />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {label ? <Text style={styles.sheetTitle}>{label}</Text> : null}
            <ScrollView
              style={styles.list}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {options.map((o) => {
                const on = o.value === value;
                return (
                  <TouchableOpacity
                    key={String(o.value)}
                    style={[styles.option, on && styles.optionOn]}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.optionText, on && styles.optionTextOn]}>
                      {o.label}
                    </Text>
                    {on ? (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 4,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.row,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  fieldDisabled: { opacity: 0.45 },
  value: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
    marginRight: 6,
  },
  placeholder: { color: colors.muted, fontWeight: '600' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(44, 36, 22, 0.35)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: radius.sheet,
    maxHeight: '70%',
    paddingTop: 16,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.brandDeep,
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  list: { paddingHorizontal: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radius.row,
    marginBottom: 2,
  },
  optionOn: { backgroundColor: colors.brand },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  optionTextOn: { color: '#fff' },
});
