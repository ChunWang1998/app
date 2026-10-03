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
import { isProUnlocked, clearProUnlocked } from '../lib/entitlements';
import { purchaseProUnlock, restoreProUnlock } from '../lib/iap';
import {
  downloadFullPack,
  ensureFullPackIndexed,
  fetchPackManifest,
  formatBytes,
  getInstalledPackMeta,
  hasLocalFullPack,
  isFullPackIndexed,
  clearLocalFullPack,
} from '../lib/fullPack';
import { t, useLanguage } from '../i18n';

/**
 * Buyout unlock + full offline pack download.
 *
 * @param {{
 *   visible: boolean,
 *   onClose: () => void,
 *   placesBaseUrl: string,
 *   onPackReady: () => void,
 *   onPackCleared?: () => void,
 * }} props
 */
export default function UnlockProModal({
  visible,
  onClose,
  placesBaseUrl,
  onPackReady,
  onPackCleared,
}) {
  useLanguage();
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
        setError(result.error || t('unlock.buyFail'));
        return;
      }
      setPro(true);
      await handleDownload();
    } catch (e) {
      setError(String(e?.message || e || t('unlock.buyFail')));
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
        setError(result.error || t('unlock.restoreFail'));
        return;
      }
      if (!result.restored) {
        Alert.alert(t('unlock.noPurchaseTitle'), t('unlock.noPurchaseBody'));
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
        Alert.alert(t('unlock.restoredTitle'), t('unlock.restoredBody'));
      }
    } catch (e) {
      setError(String(e?.message || e || t('unlock.restoreFail')));
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
      Alert.alert(t('unlock.downloadDoneTitle'), t('unlock.downloadDoneBody'));
    } catch (e) {
      setError(String(e?.message || e || t('unlock.downloadFail')));
    } finally {
      setBusy(false);
      setPhase('idle');
      setProgress(0);
    }
  };

  const handleDevReset = () => {
    Alert.alert(t('unlock.devResetTitle'), t('unlock.devResetBody'), [
      { text: t('unlock.cancel'), style: 'cancel' },
      {
        text: t('unlock.clear'),
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await clearProUnlocked();
            await clearLocalFullPack();
            setPro(false);
            setPackReady(false);
            setLocalMeta(null);
            onPackCleared?.();
            Alert.alert(t('unlock.clearedTitle'), t('unlock.clearedBody'));
          } catch (e) {
            setError(String(e?.message || e || t('unlock.clearFail')));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
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
          <Text style={styles.title}>{t('unlock.title')}</Text>
          <Text style={styles.body}>{t('unlock.body')}</Text>

          {(placeCount || sizeLabel !== '0 B') && (
            <Text style={styles.meta}>
              {placeCount ? t('unlock.places', { count: placeCount.toLocaleString() }) : ''}
              {placeCount && sizeLabel !== '0 B' ? ' · ' : ''}
              {sizeLabel !== '0 B' ? t('unlock.aboutSize', { size: sizeLabel }) : ''}
            </Text>
          )}

          {packReady ? (
            <View style={styles.readyBox}>
              <Text style={styles.readyText}>{t('unlock.ready')}</Text>
              {localMeta?.version ? (
                <Text style={styles.note}>{t('unlock.version', { version: localMeta.version })}</Text>
              ) : null}
            </View>
          ) : null}

          {!!error && <Text style={styles.error}>{error}</Text>}

          {busy && (
            <View style={styles.progressWrap}>
              <ActivityIndicator color={colors.brand} />
              <Text style={styles.progressText}>
                {phase === 'buying' && t('unlock.buying')}
                {phase === 'downloading' &&
                  t('unlock.downloading', { percent: Math.round(progress * 100) })}
                {phase === 'indexing' && t('unlock.indexing')}
                {phase === 'idle' && t('unlock.working')}
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
              <Text style={styles.btnText}>{t('unlock.buy')}</Text>
            </TouchableOpacity>
          )}

          {!packReady && pro && (
            <TouchableOpacity
              style={[styles.btn, busy && styles.btnDisabled]}
              onPress={handleDownload}
              disabled={busy}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>{t('unlock.download')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.linkBtn}
            onPress={handleRestore}
            disabled={busy}
            activeOpacity={0.85}
          >
            <Text style={styles.linkText}>{t('unlock.restore')}</Text>
          </TouchableOpacity>

          {typeof __DEV__ !== 'undefined' && __DEV__ ? (
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={handleDevReset}
              disabled={busy}
              activeOpacity={0.85}
            >
              <Text style={[styles.linkText, styles.devResetText]}>{t('unlock.devReset')}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.secondary}
            onPress={onClose}
            disabled={busy}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryText}>{packReady ? t('unlock.done') : t('unlock.later')}</Text>
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
  devResetText: {
    color: '#B42318',
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
