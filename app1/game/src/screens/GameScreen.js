import React, { useMemo, useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius } from '../theme';
import Mascot from '../components/Mascot';
import { questions } from '../data/questions';

export default function GameScreen({ playerName }) {
  const total = questions.length;
  const [index, setIndex] = useState(0);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState('idle'); // idle | wrong | solved
  const [showHint, setShowHint] = useState(false);

  const q = questions[index];
  const solved = status === 'solved';
  const isLast = index === total - 1;

  // 依答案長度產生填字格；已解出時直接顯示答案。
  const boxes = useMemo(() => {
    const chars = Array.from(q.answer);
    const source = solved ? q.answer : value;
    return chars.map((_, i) => Array.from(source)[i] || '');
  }, [q.answer, value, solved]);

  const check = () => {
    if (value.trim() === q.answer) {
      setStatus('solved');
    } else {
      setStatus('wrong');
    }
  };

  const next = () => {
    if (isLast) {
      setIndex(0);
    } else {
      setIndex(index + 1);
    }
    setValue('');
    setStatus('idle');
    setShowHint(false);
  };

  return (
    <LinearGradient colors={[colors.bgTop, colors.bgBottom]} style={styles.fill}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.appTitle}>看圖猜字</Text>
              <Text style={styles.appSubtitle}>FUN WORD GUESSING</Text>
            </View>
            <View style={styles.levelPill}>
              <Mascot size={26} color="#B9E3A8" happy />
              <Text style={styles.levelText}>
                第 {index + 1}/{total} 關
              </Text>
            </View>
          </View>

          {/* Hint image card */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>🔖 提示圖片</Text>
              <Text style={styles.cardTag}>HINT IMAGE</Text>
            </View>
            <Image source={q.hintImage} style={styles.image} resizeMode="cover" />
            <Text style={styles.caption}>{q.hintText}</Text>
          </View>

          {/* Guess image card */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>🖼 猜測圖片</Text>
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

          {/* Answer card */}
          <View style={styles.card}>
            <View style={styles.answerRow}>
              <Text style={styles.answerLead}>這是</Text>
              {boxes.map((ch, i) => (
                <View key={i} style={styles.charSlot}>
                  <Text style={styles.charText}>{ch}</Text>
                  <View style={styles.charLine} />
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
                答對了！這是「{q.answer}」🎉
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
              style={[styles.nextBtn, !solved && styles.nextBtnDisabled]}
              activeOpacity={solved ? 0.85 : 1}
              onPress={next}
              disabled={!solved}
            >
              <Text style={[styles.nextText, !solved && styles.nextTextDisabled]}>
                {isLast ? '再玩一次' : '下一關'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.footer}>💬 遇到困難？分享給好友幫忙猜看吧！</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  appTitle: { fontSize: 26, fontWeight: '800', color: colors.textDark, letterSpacing: 2 },
  appSubtitle: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 2 },
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
  cardTitle: { fontSize: 14, fontWeight: '800', color: colors.textDark },
  cardTag: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },
  image: { width: '100%', height: 170, borderRadius: radius.inner, backgroundColor: '#EFEAF6' },
  caption: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
    marginTop: 12,
  },
  hintBtn: {
    backgroundColor: colors.hintYellowSoft,
    borderRadius: radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  hintBtnText: { color: colors.hintYellow, fontWeight: '800', fontSize: 12 },
  hintReveal: {
    marginTop: 12,
    textAlign: 'center',
    color: colors.hintYellow,
    fontWeight: '700',
    fontSize: 14,
  },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 6,
  },
  answerLead: { fontSize: 22, fontWeight: '800', color: colors.textDark, marginRight: 8, marginBottom: 6 },
  charSlot: { alignItems: 'center', marginHorizontal: 6, width: 40 },
  charText: { fontSize: 30, fontWeight: '800', color: colors.accent, height: 40 },
  charLine: { width: 34, height: 4, borderRadius: 2, backgroundColor: colors.line, marginTop: 2 },
  feedback: { textAlign: 'center', fontSize: 14, fontWeight: '700', marginTop: 6, marginBottom: 4 },
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
