/**
 * Split Buddhist Chinese text into copy units (句).
 * Used when processing CBETA plain text / extracted paragraphs.
 */

const SENTENCE_END = /[。！？；]/;

const HAN = /[\u4e00-\u9fff]/;

/**
 * @param {string} text
 * @returns {string[]}
 */
export function splitSentences(text) {
  if (!text?.trim()) return [];
  const normalized = text.replace(/\s+/g, '');
  const parts = [];
  let buf = '';
  for (const ch of normalized) {
    buf += ch;
    if (SENTENCE_END.test(ch)) {
      const trimmed = buf.trim();
      if (trimmed) parts.push(trimmed);
      buf = '';
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

/**
 * @param {string[]} sentences
 * @returns {{ id: number, text: string }[]}
 */
export function toUnits(sentences) {
  return sentences.map((text, id) => ({ id, text }));
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function hasHan(text) {
  return HAN.test(text);
}
