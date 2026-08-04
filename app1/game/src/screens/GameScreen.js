import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';
import Mascot from '../components/Mascot';
import LevelDirectory from '../components/LevelDirectory';
import { questions } from '../data/questions';
import { isLevelUnlocked, saveProgress } from '../storage/progress';

const SWIPE_THRESHOLD = 56;

/** Scale blank slots so long answers stay inside the card. */
function getCharSlotMetrics(charCount, contentWidth) {
  const leadApprox = 56; // 「這是」
  const sidePad = 8;
  const available = Math.max(120, contentWidth - leadApprox - sidePad);
  const gap = charCount <= 4 ? 12 : charCount <= 6 ? 8 : 4;
  const slot = Math.min(40, Math.floor((available - gap * charCount) / Math.max(charCount, 1)));
  const width = Math.max(22, slot);
  const fontSize = Math.min(30, Math.max(16, width - 8));
  return {
    width,
    fontSize,
    lineWidth: Math.max(16, width - 6),
    marginHorizontal: gap / 2,
  };
}

const DIFFICULTY_STYLE = {
  易: { bg: colors.greenSoft, text: colors.green },
  中: { bg: colors.hintYellowSoft, text: colors.hintYellow },
  難: { bg: colors.accentSoft, text: colors.accent },
};

export default function GameScreen({
  initialIndex = 0,
  initialCompleted = [],
  onProgressChange,
}) {
  const total = questions.length;
  const [index, setIndex] = useState(initialIndex);
  const [completed, setCompleted] = useState(initialCompleted);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState('idle'); // idle | wrong | solved
  const [showHint, setShowHint] = useState(false);

  const indexRef = useRef(index);
  const completedRef = useRef(completed);
  indexRef.current = index;
  completedRef.current = completed;

  const { width: windowWidth } = useWindowDimensions();
  const q = questions[index];
  const solved = status === 'solved';
  const isLast = index === total - 1;
  const allDone = completed.length >= total;
  // card padding 16×2 + scroll padding 18×2
  const cardInnerWidth = windowWidth - 36 - 32;
  const slotMetrics = useMemo(
    () => getCharSlotMetrics(Array.from(q.answer).length, cardInnerWidth),
    [q.answer, cardInnerWidth],
  );

  const persist = useCallback(
    async (nextIndex, nextCompleted) => {
      const payload = {
        currentIndex: nextIndex,
        completed: nextCompleted,
        started: true,
      };
      onProgressChange?.(payload);
      await saveProgress(payload);
    },
    [onProgressChange],
  );

  // 切換關卡時一律清空輸入，不還原已答過的答案
  const resetLocalForLevel = useCallback(() => {
    setValue('');
    setStatus('idle');
    setShowHint(false);
  }, []);

  // 首次進入時清空輸入欄
  useEffect(() => {
    resetLocalForLevel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToLevel = useCallback(
    (nextIndex) => {
      if (nextIndex < 0 || nextIndex >= total) return;
      if (!isLevelUnlocked(nextIndex, completedRef.current)) return;
      if (nextIndex === indexRef.current) return;
      setIndex(nextIndex);
      resetLocalForLevel();
      persist(nextIndex, completedRef.current);
    },
    [total, resetLocalForLevel, persist],
  );

  const unlockedNeighbors = useCallback(() => {
    const list = completedRef.current;
    let prev = -1;
    let next = -1;
    for (let i = indexRef.current - 1; i >= 0; i -= 1) {
      if (isLevelUnlocked(i, list)) {
        prev = i;
        break;
      }
    }
    for (let i = indexRef.current + 1; i < total; i += 1) {
      if (isLevelUnlocked(i, list)) {
        next = i;
        break;
      }
    }
    return { prev, next };
  }, [total]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.2,
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) < SWIPE_THRESHOLD) return;
          const { prev, next } = unlockedNeighbors();
          // 右滑 → 上一關；左滑 → 下一關（僅已解鎖／通關可達）
          if (g.dx > 0 && prev >= 0) goToLevel(prev);
          else if (g.dx < 0 && next >= 0) goToLevel(next);
        },
      }),
    [goToLevel, unlockedNeighbors],
  );

  const acceptedAnswers = useMemo(
    () => q.answers || [q.answer],
    [q.answer, q.answers],
  );

  const boxes = useMemo(() => {
    const chars = Array.from(q.answer);
    const source = solved ? value || q.answer : value;
    return chars.map((_, i) => Array.from(source)[i] || '');
  }, [q.answer, value, solved]);

  const check = async () => {
    const guess = value.trim();
    if (acceptedAnswers.includes(guess)) {
      setValue(guess);
      setStatus('solved');
      const nextCompleted = completed.includes(index)
        ? completed
        : [...completed, index];
      setCompleted(nextCompleted);
      await persist(index, nextCompleted);
    } else {
      setStatus('wrong');
    }
  };

  const next = () => {
    if (isLast) {
      // 全部通關後「再玩一次」回到第 1 關（仍保留通關進度）
      goToLevel(0);
      return;
    }
    const target = index + 1;
    if (isLevelUnlocked(target, completed)) {
      goToLevel(target);
    }
  };

  // 本關剛答對，或先前已通關，都可進下一關（回上一關時輸入已清空，不必重答才能離開）
  const canGoNext =
    (solved || completed.includes(index)) &&
    (isLast || isLevelUnlocked(index + 1, completed));

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.fill} {...panResponder.panHandlers}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <View>
                <Text style={styles.appTitle}>看圖猜字</Text>
                <Text style={styles.appSubtitle}>FUN WORD GUESSING</Text>
              </View>
              <View style={styles.headerMeta}>
                <View style={styles.typeCol}>
                  <Text style={styles.typeLabel}>詞性</Text>
                  <Text style={styles.typeValue}>{q.type || '名詞'}</Text>
                </View>
                <View
                  style={[
                    styles.difficultyCol,
                    { backgroundColor: (DIFFICULTY_STYLE[q.difficulty] || DIFFICULTY_STYLE['中']).bg },
                  ]}
                >
                  <Text style={styles.difficultyLabel}>難度</Text>
                  <Text
                    style={[
                      styles.difficultyValue,
                      { color: (DIFFICULTY_STYLE[q.difficulty] || DIFFICULTY_STYLE['中']).text },
                    ]}
                  >
                    {q.difficulty || '中'}
                  </Text>
                </View>
                <View style={styles.levelPill}>
                  <Mascot size={26} color="#B9E3A8" happy />
                  <Text style={styles.levelText}>
                    第 {index + 1}/{total} 關
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  🔖 提示圖片
                </Text>
                <Text style={styles.cardTag} numberOfLines={1}>
                  HINT IMAGE
                </Text>
              </View>
              <Image source={q.hintImage} style={styles.image} resizeMode="cover" />
              <Text style={styles.caption}>{q.hintText}</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  🖼 猜測圖片
                </Text>
                <TouchableOpacity
                  style={styles.hintBtn}
                  activeOpacity={0.8}
                  onPress={() => setShowHint((s) => !s)}
                >
                  <Text style={styles.hintBtnText}>💡 提示</Text>
                </TouchableOpacity>
              </View>
              <Image source={q.guessImage} style={styles.image} resizeMode="cover" />
              {showHint && <Text style={styles.hintReveal}>提示：{q.hint}</Text>}
            </View>

            <View style={styles.card}>
              <View style={styles.answerRow}>
                <Text style={styles.answerLead}>這是</Text>
                {boxes.map((ch, i) => (
                  <View
                    key={i}
                    style={[
                      styles.charSlot,
                      {
                        width: slotMetrics.width,
                        marginHorizontal: slotMetrics.marginHorizontal,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.charText,
                        {
                          fontSize: slotMetrics.fontSize,
                          height: slotMetrics.fontSize + 10,
                        },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.6}
                    >
                      {ch}
                    </Text>
                    <View
                      style={[styles.charLine, { width: slotMetrics.lineWidth }]}
                    />
                  </View>
                ))}
              </View>

              {status === 'wrong' && (
                <Text style={[styles.feedback, styles.feedbackWrong]}>
                  再想想看～不是這個喔！
                </Text>
              )}
              {solved && (
                <Text style={[styles.feedback, styles.feedbackOk]}>
                  答對了！這是「{value || q.answer}」🎉
                </Text>
              )}

              <View style={styles.inputRow}>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.input}
                    placeholder="在這裡填字"
                    placeholderTextColor={colors.textMuted}
                    value={value}
                    onChangeText={(t) => {
                      setValue(t);
                      if (status === 'wrong') setStatus('idle');
                    }}
                    editable={!solved}
                    returnKeyType="done"
                    onSubmitEditing={check}
                  />
                  <Text style={styles.pencil}>✏️</Text>
                </View>
                <TouchableOpacity
                  style={[styles.confirmBtn, solved && styles.confirmBtnDone]}
                  activeOpacity={0.85}
                  onPress={check}
                  disabled={solved}
                >
                  <Text style={styles.confirmText}>確認</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.nextBtn, !canGoNext && styles.nextBtnDisabled]}
                activeOpacity={canGoNext ? 0.85 : 1}
                onPress={next}
                disabled={!canGoNext}
              >
                <Text style={[styles.nextText, !canGoNext && styles.nextTextDisabled]}>
                  {isLast ? (allDone ? '再玩一次' : '下一關') : '下一關'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footer}>💬 遇到困難？分享給好友幫忙猜看吧！</Text>
          </ScrollView>
        </View>

        <LevelDirectory
          total={total}
          currentIndex={index}
          completed={completed}
          onSelect={goToLevel}
        />
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
    gap: 8,
  },
  appTitle: { fontSize: 26, fontWeight: '800', color: colors.textDark, letterSpacing: 2 },
  appSubtitle: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 2 },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  typeCol: {
    minWidth: 44,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.inner,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    backgroundColor: '#EFEAF6',
  },
  typeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  typeValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textDark,
  },
  difficultyCol: {
    minWidth: 40,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.inner,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  difficultyLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  difficultyValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    shadowColor: colors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  levelText: { marginLeft: 6, color: colors.accent, fontWeight: '800', fontSize: 13 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.cardShadow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textDark,
    flexShrink: 1,
    marginRight: 8,
  },
  cardTag: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    flexShrink: 0,
  },
  image: { width: '100%', height: 170, borderRadius: radius.inner, backgroundColor: '#EFEAF6' },
  caption: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
    marginTop: 12,
    paddingHorizontal: 4,
    flexShrink: 1,
  },
  hintBtn: {
    backgroundColor: colors.hintYellowSoft,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
    flexShrink: 0,
  },
  hintBtnText: { color: colors.hintYellow, fontWeight: '800', fontSize: 12 },
  hintReveal: {
    marginTop: 12,
    textAlign: 'center',
    color: colors.hintYellow,
    fontWeight: '700',
    fontSize: 14,
    paddingHorizontal: 4,
  },
  answerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 6,
  },
  answerLead: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textDark,
    marginRight: 8,
    marginBottom: 6,
  },
  charSlot: { alignItems: 'center', marginBottom: 6 },
  charText: {
    fontWeight: '800',
    color: colors.accent,
    textAlign: 'center',
    width: '100%',
  },
  charLine: { height: 4, borderRadius: 2, backgroundColor: colors.line, marginTop: 2 },
  feedback: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  feedbackWrong: { color: colors.accent },
  feedbackOk: { color: colors.green },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F1F8',
    borderRadius: radius.inner,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.textDark },
  pencil: { fontSize: 15, opacity: 0.6 },
  confirmBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 22,
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  confirmBtnDone: { backgroundColor: colors.disabled, shadowOpacity: 0 },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  nextBtn: {
    marginTop: 14,
    backgroundColor: colors.green,
    borderRadius: radius.inner,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextBtnDisabled: { backgroundColor: colors.disabled },
  nextText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 2 },
  nextTextDisabled: { color: colors.disabledText },
  footer: { textAlign: 'center', color: colors.textMuted, fontSize: 12, marginTop: 4 },
});
