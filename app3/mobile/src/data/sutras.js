/**
 * Corpus-backed sutra API (replaces inline sutras.js bundle).
 * Canonical work ids = CBETA plain ids (e.g. T0251); XML-style T08n0251 and legacy slugs resolve via aliases.
 */
export {
  initCorpus,
  isCorpusReady,
  listWorks,
  listSutras,
  getWorkMeta,
  getSutra,
  getWork,
  getUnit,
  getCorpusStatus,
  resetCorpusCache,
} from '../storage/corpus';
