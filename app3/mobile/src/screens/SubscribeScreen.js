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
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
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
    Alert.alert('已解鎖', '訂閱已生效，可以使用 Connect、聊天與聚會。');
    onBack?.();
  };

  const handlePurchase = async () => {
    setError('');
    setBusy(true);
    try {
      const result = await purchaseSubscription();
      if (result.cancelled) return;
      if (!result.ok) {
        setError(result.error || '購買失敗');
        return;
      }
      await finishOk();
    } catch (e) {
      setError(String(e?.message || e || '購買失敗'));
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setError('');
    setBusy(true);
    try {
      const result = await restoreSubscription();
      if (!result.ok) {
        setError(result.error || '恢復失敗');
        return;
      }
      if (!result.restored) {
        Alert.alert('找不到訂閱', '此 Apple ID 尚無有效的鄰汪訂閱。');
        return;
      }
      await finishOk();
    } catch (e) {
      setError(String(e?.message || e || '恢復失敗'));
    } finally {
      setBusy(false);
    }
  };

  const handleRedeem = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('僅限 iOS', '優惠碼兌換需使用 iPhone／iPad。');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const result = await redeemOfferCode();
      if (result.cancelled) return;
      if (!result.ok) {
        setError(result.error || '兌換失敗');
        return;
      }
      if (result.restored === false) {
        Alert.alert(
          '請完成兌換',
          '若已在系統畫面輸入優惠碼，請再點「恢復購買」。',
        );
        return;
      }
      await finishOk();
    } catch (e) {
      setError(String(e?.message || e || '兌換失敗'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <View style={[styles.box, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={onBack} disabled={busy}>
          <Text style={styles.back}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.h}>訂閱鄰汪 Premium</Text>
        <Text style={styles.p}>
          瀏覽探索清單免費。訂閱後可查看主人詳情、發起／接受
          Connect、聊天，以及創辦／報名汪汪聚會。
        </Text>
        <Text style={styles.price}>NT$60／月（自動續訂）</Text>
        <Text style={styles.note}>
          可隨時在 Apple ID 訂閱設定取消。有優惠碼？請用下方「兌換優惠碼」（例如一個月免費）。
        </Text>
        <Text style={styles.sku}>商品 ID：{iapProductId()}</Text>

        {!!error && <Text style={styles.error}>{error}</Text>}
        {busy && (
          <View style={styles.busyRow}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.busyText}>處理中…</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.cta, busy && styles.ctaDisabled]}
          onPress={handlePurchase}
          disabled={busy}
        >
          <Text style={styles.ctaText}>立即訂閱</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={handleRestore}
          disabled={busy}
        >
          <Text style={styles.linkText}>恢復購買</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={handleRedeem}
          disabled={busy}
        >
          <Text style={styles.linkText}>兌換優惠碼</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  box: { flex: 1, paddingHorizontal: 22 },
  back: { color: colors.brandDeep, fontWeight: '800', marginBottom: 16 },
  h: { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 12 },
  p: { fontSize: 15, color: colors.ink, lineHeight: 22, marginBottom: 10 },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.brandDeep,
    marginBottom: 8,
  },
  note: { color: colors.muted, lineHeight: 20, marginBottom: 6 },
  sku: { fontSize: 11, color: colors.muted, marginBottom: 12 },
  error: { color: '#B42318', marginBottom: 10, lineHeight: 18 },
  busyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  busyText: { color: colors.muted, fontWeight: '600' },
  cta: {
    marginTop: 8,
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.55 },
  ctaText: { color: '#fff', fontWeight: '800' },
  linkBtn: { marginTop: 14, alignItems: 'center', paddingVertical: 6 },
  linkText: { color: colors.brandDeep, fontWeight: '700', fontSize: 15 },
});
