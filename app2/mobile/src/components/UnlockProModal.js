import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { colors, radius } from '../theme';
import { isProUnlocked } from '../lib/entitlements';
import { purchaseProUnlock, restoreProUnlock } from '../lib/iap';
import {
  downloadFullPack,
  ensureFullPackIndexed,
  fetchPackManifest,
  formatBytes,
  getInstalledPackMeta,
  hasLocalFullPack,
  isFullPackIndexed,
} from '../lib/fullPack';

/**
 * Buyout unlock + full offline pack download.
 *
 * @param {{
 *   visible: boolean,
 *   onClose: () => void,
 *   placesBaseUrl: string,
 *   onPackReady: () => void,
 * }} props
 */
export default function UnlockProModal({
  visible,
  onClose,
  placesBaseUrl,
  onPackReady,
}) {
  const [pro, setPro] = useState(false);
  const [packReady, setPackReady] = useState(false);
  const [remoteMeta, setRemoteMeta] = useState(null);
  const [localMeta, setLocalMeta] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle | buying | downloading | indexing
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    const unlocked = await isProUnlocked();
    setPro(unlocked);
    const local = await getInstalledPackMeta();
    setLocalMeta(local);
    const hasFile = await hasLocalFullPack();
    let indexed = isFullPackIndexed();
    if (unlocked && hasFile && !indexed) {
      indexed = await ensureFullPackIndexed();
    }
    setPackReady(unlocked && hasFile && indexed);

    try {
      if (placesBaseUrl) {
        const remote = await fetchPackManifest(placesBaseUrl);
        setRemoteMeta(remote);
      }
    } catch {
      // offline / CDN missing — still allow using local pack
    }
  }, [placesBaseUrl]);

  useEffect(() => {
    if (!visible) return;
    setError('');
    setProgress(0);
    setPhase('idle');
    refresh();
  }, [visible, refresh]);

  const handleBuy = async () => {
    setError('');
    setBusy(true);
    setPhase('buying');
    try {
      const result = await purchaseProUnlock();
      if (result.cancelled) return;
      if (!result.ok) {
        setError(result.error || '購買失敗');
        return;
      }
      setPro(true);
      await handleDownload();
    } catch (e) {
      setError(String(e?.message || e || '購買失敗'));
    } finally {
      setBusy(false);
      setPhase('idle');
    }
  };

  const handleRestore = async () => {
    setError('');
    setBusy(true);
    try {
      const result = await restoreProUnlock();
      if (!result.ok) {
        setError(result.error || '恢復失敗');
        return;
      }
      if (!result.restored) {
        Alert.alert('找不到購買紀錄', '此 Apple ID 尚無「完整資料包」買斷。');
        return;
      }
      setPro(true);
      const hasFile = await hasLocalFullPack();
      if (!hasFile) {
        await handleDownload();
      } else {
        await ensureFullPackIndexed();
        setPackReady(true);
        onPackReady?.();
        Alert.alert('已恢復', '購買已恢復，並可使用本機資料包。');
      }
    } catch (e) {
      setError(String(e?.message || e || '恢復失敗'));
    } finally {
      setBusy(false);
      setPhase('idle');
    }
  };

  const handleDownload = async () => {
    setError('');
    setBusy(true);
    setPhase('downloading');
    setProgress(0);
    try {
      const meta = await downloadFullPack(placesBaseUrl, (ratio) => {
        setProgress(ratio);
        if (ratio >= 0.98) setPhase('indexing');
      });
      setLocalMeta(meta);
      setRemoteMeta(meta);
      setPackReady(true);
      onPackReady?.();
      Alert.alert('下載完成', '已解鎖全部廁所，可離線使用完整資料包。');
    } catch (e) {
      setError(String(e?.message || e || '下載失敗'));
    } finally {
      setBusy(false);
      setPhase('idle');
      setProgress(0);
    }
  };

  const sizeLabel = formatBytes(
    remoteMeta?.byteSize || localMeta?.byteSize || 0,
  );
  const placeCount =
    remoteMeta?.placeCount || localMeta?.placeCount || null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>解鎖完整資料包</Text>
          <Text style={styles.body}>
            免費版可線上查看全台 7-11。買斷後下載完整資料包，解鎖公廁與其他類型，並可離線使用。
          </Text>

          {(placeCount || sizeLabel !== '0 B') && (
            <Text style={styles.meta}>
              {placeCount ? `${placeCount.toLocaleString()} 筆地點` : ''}
              {placeCount && sizeLabel !== '0 B' ? ' · ' : ''}
              {sizeLabel !== '0 B' ? `約 ${sizeLabel}` : ''}
            </Text>
          )}

          {packReady ? (
            <View style={styles.readyBox}>
              <Text style={styles.readyText}>已解鎖 · 完整資料包可用</Text>
              {localMeta?.version ? (
                <Text style={styles.note}>版本 {localMeta.version}</Text>
              ) : null}
            </View>
          ) : null}

          {!!error && <Text style={styles.error}>{error}</Text>}

          {busy && (
            <View style={styles.progressWrap}>
              <ActivityIndicator color={colors.brand} />
              <Text style={styles.progressText}>
                {phase === 'buying' && '處理購買…'}
                {phase === 'downloading' &&
                  `下載資料包… ${Math.round(progress * 100)}%`}
                {phase === 'indexing' && '建立離線索引…'}
                {phase === 'idle' && '處理中…'}
              </Text>
            </View>
          )}

          {!packReady && !pro && (
            <TouchableOpacity
              style={[styles.btn, busy && styles.btnDisabled]}
              onPress={handleBuy}
              disabled={busy}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>買斷並下載</Text>
            </TouchableOpacity>
          )}

          {!packReady && pro && (
            <TouchableOpacity
              style={[styles.btn, busy && styles.btnDisabled]}
              onPress={handleDownload}
              disabled={busy}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>下載完整資料包</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.linkBtn}
            onPress={handleRestore}
            disabled={busy}
            activeOpacity={0.85}
          >
            <Text style={styles.linkText}>恢復購買</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondary}
            onPress={onClose}
            disabled={busy}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryText}>{packReady ? '完成' : '稍後'}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(23,51,47,0.4)',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.sheet,
    padding: 22,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.brandDeep,
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    color: colors.ink,
    lineHeight: 22,
  },
  meta: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
  readyBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: radius.card,
    backgroundColor: '#E8F7F4',
  },
  readyText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.brandDeep,
  },
  note: {
    marginTop: 4,
    fontSize: 12,
    color: colors.muted,
  },
  error: {
    marginTop: 12,
    fontSize: 13,
    color: '#B42318',
    lineHeight: 18,
  },
  progressWrap: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
  btn: {
    marginTop: 18,
    backgroundColor: colors.brand,
    paddingVertical: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.55,
  },
  btnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
  },
  linkBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 6,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brandDeep,
  },
  secondary: {
    marginTop: 4,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
  },
});
