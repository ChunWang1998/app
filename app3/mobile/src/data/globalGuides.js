import { slotLabel } from './constants';

/**
 * Two global demo neighbors. Everyone sees them, any city.
 * 團團 always replies instantly. 可可 replies after a short wait.
 * Both send the first messages after Connect succeeds.
 */
export const GUIDE_REPLY_ID = 'guide-reply';
export const GUIDE_TRY_ID = 'guide-try';

function guide(partial) {
  return {
    photoUri: null,
    photoOk: true,
    isGlobal: true,
    isGuide: true,
    playWith: 'parallel',
    canPhoto: true,
    registeredAt: '2025-06-01T00:00:00.000Z',
    city: '全域',
    district: '鄰汪夥伴',
    ...partial,
    slots: (partial.slots || []).map((s) => ({ ...s, label: slotLabel(s) })),
  };
}

export const GLOBAL_GUIDES = [
  guide({
    id: GUIDE_REPLY_ID,
    dogName: '團團',
    ownerNick: '小安',
    breed: '柯基',
    size: '小型',
    ageRange: '1–3 歲',
    personalities: ['友善', '活力'],
    intro: '常在公園慢走，第一次見面會回你。',
    slots: [
      { day: 'weekday', slot: 'evening' },
      { day: 'weekend', slot: 'morning' },
    ],
    places: ['中央公園', '河濱步道'],
    outingCount: 21,
    connectCount: 40,
    alwaysReply: true,
    delayReplyMs: 0,
    messages: [
      '嗨，我是團團的主人小安。歡迎加入鄰汪！',
      '第一次見面建議公園牽繩平行走 15 分鐘，覺得 OK 再靠近。',
    ],
  }),
  guide({
    id: GUIDE_TRY_ID,
    dogName: '可可',
    ownerNick: '小晴',
    breed: '米克斯',
    size: '中型',
    ageRange: '4–7 歲',
    personalities: ['慢熱', '友善'],
    intro: '假日早上出沒，會回 Connect 並傳訊息。',
    slots: [
      { day: 'weekend', slot: 'morning' },
      { day: 'weekend', slot: 'afternoon' },
    ],
    places: ['森林公園'],
    outingCount: 11,
    connectCount: 18,
    alwaysReply: true,
    delayReplyMs: 1600,
    messages: [
      '可可看到你了！我是小晴。',
      '假日早上我們常去公園，有空可以約平行走。',
    ],
  }),
];

export function isGuideId(id) {
  return id === GUIDE_REPLY_ID || id === GUIDE_TRY_ID;
}

export function getGuide(id) {
  return GLOBAL_GUIDES.find((g) => g.id === id) || null;
}
