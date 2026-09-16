import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';
import { APP_PREMIUM } from '../data/branding';
import {
  purchaseSubscription,
  restoreSubscription,
  redeemOfferCode,
  iapProductId,
} from '../lib/iap';

export default function SubscribeScreen({ onBack, onUnlocked }) {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const finishOk = async () => {
    await onUnlocked?.();
    Alert.alert('已解鎖', 'Premium 已生效：每日 5 次配對，每週可改興趣。');
    onBack?.();
  };

  const run = async (fn) => {
    setError('');
    setBusy(true);
    try {
      const result = await fn();
      if (result.cancelled) return;
      if (!result.ok) {
        setError(result.error || '操作失敗');
        return;
      }
      if (result.restored === false && fn === restoreSubscription) {
        Alert.alert('找不到訂閱', '此 Apple ID 尚無有效訂閱。');
        return;
      }
      await finishOk();
    } catch (e) {
      setError(String(e?.message || e || '操作失敗'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <View
        style={[
          styles.pad,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Text style={styles.brand}>{APP_PREMIUM}</Text>
        <Text style={styles.sub}>商品 ID：{iapProductId()}</Text>

        <View style={styles.card}>
          <Text style={styles.bullet}>• 每日最多 5 次配對</Text>
          <Text style={styles.bullet}>• 每週可修改有興趣的身份</Text>
          <Text style={styles.bullet}>• 支援恢復購買與優惠碼</Text>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={styles.primary}
          disabled={busy}
          onPress={() => run(purchaseSubscription)}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>立即訂閱</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondary}
          disabled={busy}
          onPress={() => run(restoreSubscription)}
        >
          <Text style={styles.secondaryText}>恢復購買</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondary}
          disabled={busy}
          onPress={() => {
            if (Platform.OS !== 'ios') {
              Alert.alert('僅限 iOS', '優惠碼兌換需使用 iPhone／iPad。');
              return;
            }
            run(redeemOfferCode);
          }}
        >
          <Text style={styles.secondaryText}>兌換優惠碼</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={onBack} disabled={busy}>
          <Text style={styles.linkText}>返回</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { flex: 1, paddingHorizontal: 20, gap: 12 },
  brand: { fontSize: 28, fontWeight: '700', color: colors.ink },
  sub: { color: colors.muted, fontSize: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  bullet: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  error: { color: colors.danger },
  primary: {
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.row,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 14,
    borderRadius: radius.row,
    alignItems: 'center',
  },
  secondaryText: { color: colors.ink, fontWeight: '600' },
  link: { alignItems: 'center', marginTop: 8 },
  linkText: { color: colors.muted, fontWeight: '600' },
});
