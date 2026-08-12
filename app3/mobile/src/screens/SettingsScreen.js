import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, type } from '../theme';
import { getMusicEnabled } from '../storage/prefs';
import { applyMusicPreference } from '../lib/music';
import { getCorpusStatus, initCorpus, resetCorpusCache } from '../data/sutras';
import { CORPUS_CDN_BASE, FULL_PACK_ESTIMATE_BYTES } from '../storage/corpus/config';
import {
  checkFullPackUpdate,
  downloadFullPack,
  deleteFullPack,
  getDownloadProgress,
  clearDownloadProgress,
} from '../storage/corpus/download';

function formatMb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export default function SettingsScreen({ onBack }) {
  const [musicOn, setMusicOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [corpus, setCorpus] = useState(null);
  const [remote, setRemote] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(getDownloadProgress());

  const refreshCorpus = useCallback(async () => {
    setCorpus(getCorpusStatus());
    if (!CORPUS_CDN_BASE) {
      setRemote(null);
      return;
    }
    try {
      const info = await checkFullPackUpdate();
      setRemote(info.ok ? info : { ok: false, error: info.error });
    } catch (e) {
      setRemote({ ok: false, error: e?.message || '無法連線' });
    }
  }, []);

  useEffect(() => {
    getMusicEnabled().then((enabled) => {
      setMusicOn(enabled);
      setLoading(false);
    });
    refreshCorpus();
  }, [refreshCorpus]);

  const onToggleMusic = async (value) => {
    setMusicOn(value);
    await applyMusicPreference(value);
  };

  const onDownloadFull = () => {
    if (!CORPUS_CDN_BASE) {
      Alert.alert(
        '尚未設定 CDN',
        '請在建置時設定 EXPO_PUBLIC_CORPUS_CDN_BASE，並將全庫部署到該位址。',
      );
      return;
    }
    const est = remote?.totalBytes || FULL_PACK_ESTIMATE_BYTES;
    Alert.alert(
      '下載完整佛典庫',
      `約 ${formatMb(est)}，建議使用 Wi‑Fi。下載後可離線瀏覽與抄寫全 CBETA 集成。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '開始下載',
          onPress: async () => {
            setDownloading(true);
            const result = await downloadFullPack({
              onProgress: (p) => setProgress({ ...p }),
            });
            setDownloading(false);
            clearDownloadProgress();
            setProgress(getDownloadProgress());
            if (!result.ok) {
              Alert.alert('下載失敗', result.error);
              return;
            }
            resetCorpusCache();
            await initCorpus();
            await refreshCorpus();
            Alert.alert('下載完成', `已安裝 ${result.workCount} 部經（${result.version}）`);
          },
        },
      ],
    );
  };

  const onDeleteFull = () => {
    Alert.alert(
      '刪除全庫',
      '僅刪除下載的完整佛典庫，精選入門包仍可使用。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            await deleteFullPack();
            resetCorpusCache();
            await initCorpus();
            await refreshCorpus();
          },
        },
      ],
    );
  };

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
        <View style={styles.content}>
          <TouchableOpacity onPress={onBack} hitSlop={12}>
            <Text style={styles.back}>← 返回</Text>
          </TouchableOpacity>
          <Text style={styles.title}>設定</Text>

          <Text style={styles.sectionLabel}>背景音樂</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>循環播放</Text>
              <Switch
                value={musicOn}
                onValueChange={onToggleMusic}
                disabled={loading}
                trackColor={{ false: colors.line, true: colors.brandSoft }}
                thumbColor={musicOn ? colors.brand : '#f4f4f4'}
                ios_backgroundColor={colors.line}
              />
            </View>
          </View>

          <Text style={styles.sectionLabel}>佛典庫（離線）</Text>
          <View style={styles.card}>
            <Text style={styles.meta}>
              入門包：{corpus?.starterWorks ?? '—'} 部（已內建）
            </Text>
            <Text style={styles.meta}>
              目錄共 {corpus?.catalogCount ?? '—'} 部可選
            </Text>
            <Text style={styles.meta}>
              全庫：{corpus?.fullInstalled ? `已安裝 ${corpus.fullVersion}` : '未安裝'}
            </Text>
            {CORPUS_CDN_BASE ? (
              <Text style={styles.metaSm}>
                遠端：{remote?.ok ? remote.remoteVersion : remote?.error || '檢查中…'}
              </Text>
            ) : (
              <Text style={styles.metaSm}>CDN 未設定（僅入門包）</Text>
            )}

            {downloading ? (
              <View style={styles.progressRow}>
                <ActivityIndicator color={colors.brand} />
                <Text style={styles.meta}>
                  {progress.label || '下載中…'}{' '}
                  {progress.fraction > 0
                    ? `${Math.round(progress.fraction * 100)}%`
                    : ''}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.actionBtn, !CORPUS_CDN_BASE && styles.actionDisabled]}
              onPress={onDownloadFull}
              disabled={downloading || !CORPUS_CDN_BASE}
            >
              <Text style={styles.actionText}>
                {corpus?.fullInstalled ? '重新下載全庫' : '下載完整佛典庫'}
              </Text>
            </TouchableOpacity>

            {corpus?.fullInstalled ? (
              <TouchableOpacity
                style={styles.actionBtnSecondary}
                onPress={onDeleteFull}
                disabled={downloading}
              >
                <Text style={styles.actionTextSecondary}>刪除已下載全庫</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flex: 1, padding: 24 },
  back: { fontSize: type.bodySm, color: colors.brandDeep, fontWeight: '600' },
  title: {
    marginTop: 16,
    fontSize: type.title,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 8,
  },
  sectionLabel: {
    marginTop: 20,
    marginBottom: 10,
    fontSize: type.subtitle,
    fontWeight: '700',
    color: colors.ink,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: type.body,
    color: colors.ink,
    fontWeight: '600',
  },
  meta: {
    fontSize: type.label,
    color: colors.muted,
    lineHeight: 22,
  },
  metaSm: {
    fontSize: type.label,
    color: colors.muted,
    opacity: 0.85,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  actionBtn: {
    marginTop: 12,
    backgroundColor: colors.brand,
    borderRadius: radius.button,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionDisabled: {
    opacity: 0.45,
  },
  actionText: {
    color: '#fff',
    fontSize: type.bodySm,
    fontWeight: '700',
  },
  actionBtnSecondary: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionTextSecondary: {
    color: colors.brandDeep,
    fontSize: type.bodySm,
    fontWeight: '600',
  },
});
