/** Align Mandarin zhuyin syllables to Han characters; punctuation gets empty zy. */

const HAN = /[\u4e00-\u9fff]/;

export function alignZhuyin(text, zhuyinList = []) {
  let i = 0;
  return [...text].map((c) => {
    if (!HAN.test(c)) return { c, zy: '' };
    const zy = zhuyinList[i] || '';
    i += 1;
    return { c, zy };
  });
}
