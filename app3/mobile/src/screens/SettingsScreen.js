import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePrefs } from '../context/AppPrefs';
import { radius } from '../theme';
import ScreenHeader from '../components/ScreenHeader';

export default function SettingsScreen({
  profile,
  onProfile,
  hasUnreadChat = false,
}) {
  const insets = useSafeAreaInsets();
  const { theme, lang, colors, setTheme, setLang, t } = usePrefs();

  return (
    <View style={[styles.fill, { backgroundColor: 'transparent' }]}>
      <ScreenHeader
        title={t('settingsTitle')}
        subtitle=""
        photoUri={profile?.photoUri}
        onProfile={onProfile}
        showAlert={hasUnreadChat}
      />
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.section, { color: colors.brandDeep }]}>
          {t('appearance')}
        </Text>
        <View style={styles.row}>
          <Option
            colors={colors}
            label={t('lightMode')}
            selected={theme === 'light'}
            onPress={() => setTheme('light')}
          />
          <Option
            colors={colors}
            label={t('darkMode')}
            selected={theme === 'dark'}
            onPress={() => setTheme('dark')}
          />
        </View>

        <Text
          style={[styles.section, { color: colors.brandDeep, marginTop: 20 }]}
        >
          {t('language')}
        </Text>
        <View style={styles.row}>
          <Option
            colors={colors}
            label={t('chinese')}
            selected={lang === 'zh'}
            onPress={() => setLang('zh')}
          />
          <Option
            colors={colors}
            label={t('english')}
            selected={lang === 'en'}
            onPress={() => setLang('en')}
          />
        </View>

        <Text
          style={[styles.section, { color: colors.brandDeep, marginTop: 28 }]}
        >
          {t('rolesHelpTitle')}
        </Text>
        <View
          style={[
            styles.helpCard,
            { backgroundColor: colors.card, borderColor: colors.line },
          ]}
        >
          <Text style={[styles.helpQ, { color: colors.ink }]}>
            {t('captainHelpQ')}
          </Text>
          <Text style={[styles.helpA, { color: colors.muted }]}>
            {t('captainHelpA')}
          </Text>
          <Text style={[styles.helpQ, { color: colors.ink, marginTop: 14 }]}>
            {t('memberHelpQ')}
          </Text>
          <Text style={[styles.helpA, { color: colors.muted }]}>
            {t('memberHelpA')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Option({ colors, label, selected, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.opt,
        {
          backgroundColor: selected ? colors.chipOn : colors.card,
          borderColor: selected ? colors.brand : colors.line,
        },
      ]}
    >
      <Text
        style={[
          styles.optTxt,
          { color: selected ? colors.brandDeep : colors.ink },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { paddingHorizontal: 16, paddingTop: 8 },
  section: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10 },
  opt: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  optTxt: { fontWeight: '800', fontSize: 15 },
  helpCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 14,
  },
  helpQ: { fontSize: 15, fontWeight: '800', marginBottom: 6 },
  helpA: { fontSize: 13, lineHeight: 20 },
});
