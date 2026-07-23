import AsyncStorage from '@react-native-async-storage/async-storage';
import { questions } from '../data/questions';

const KEY = '@xiangyin/progress';

const defaultProgress = () => ({
  currentIndex: 0,
  completed: [], // 已通關的關卡 index（0-based）
  started: false,
});

export async function loadProgress() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw);
    const max = questions.length - 1;
    return {
      currentIndex: clamp(Number(parsed.currentIndex) || 0, 0, max),
      completed: Array.isArray(parsed.completed)
        ? parsed.completed.filter((i) => i >= 0 && i <= max)
        : [],
      started: Boolean(parsed.started),
    };
  } catch {
    return defaultProgress();
  }
}

export async function saveProgress(progress) {
  const max = questions.length - 1;
  const payload = {
    currentIndex: clamp(Number(progress.currentIndex) || 0, 0, max),
    completed: Array.isArray(progress.completed)
      ? [...new Set(progress.completed.filter((i) => i >= 0 && i <= max))]
      : [],
    started: Boolean(progress.started),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(payload));
  return payload;
}

/** 可進入的關卡：已通關 + 目前最遠可挑戰關（completed 的下一關，至少第 0 關） */
export function isLevelUnlocked(index, completed) {
  if (index === 0) return true;
  const set = new Set(completed);
  if (set.has(index)) return true;
  // 前一關通關後解鎖下一關
  return set.has(index - 1);
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
