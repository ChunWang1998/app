export const FOUNDER_CAP = 100;
export const MAX_CHAT = 20;
export const MAX_SLOTS = 3;
export const MAX_PLACES = 3;
export const MAX_INTRO = 50;
export const GATHERING_CAP = 10;
export const GATHERING_WITHIN_DAYS = 7;

export const TRIAL_CITIES = ['臺北市', '新北市', '臺南市', '高雄市'];

/** NLSC county codes — only used as API path, not as a district list. */
export const COUNTY_CODE = {
  臺北市: 'A',
  新北市: 'F',
  臺南市: 'D',
  高雄市: 'E',
};

export const PERSONALITIES = ['友善', '怕生', '活力', '慢熱'];

export const SIZES = ['小型', '中型', '大型'];

export const AGE_RANGES = ['未滿 1 歲', '1–3 歲', '4–7 歲', '8 歲以上'];

export const DAY_TYPES = [
  { id: 'weekday', label: '平日' },
  { id: 'weekend', label: '假日' },
];

export const TIME_SLOTS = [
  { id: 'morning', label: '早上', hint: '11 點前' },
  { id: 'noon', label: '中午', hint: '11–14' },
  { id: 'afternoon', label: '下午', hint: '14–17' },
  { id: 'evening', label: '傍晚', hint: '17–19' },
  { id: 'night', label: '晚上', hint: '19 以後' },
];

export const PLAY_OPTIONS = [
  { id: 'play', label: '可一起玩' },
  { id: 'parallel', label: '需慢熱牽繩平行走' },
];

/** Shown once when a Connect succeeds — not a profile checklist. */
export const CONNECT_REMINDER =
  '見面提醒：雙方主人請全程在場。第一次請約公共公園，不要約私人庭院或室內。全程牽繩，直到雙方口頭同意才靠近。體型差大時預設平行走、不互相撲。若任一方的狗出現壓力訊號（躲、吠、低吼、身體僵硬），立刻拉開並結束當次。合照需當下口頭同意；夜間不要用閃光燈直射眼睛。現場怎麼走由你們自己決定。';

export function slotLabel(slot) {
  const day = DAY_TYPES.find((d) => d.id === slot.day)?.label || slot.day;
  const time = TIME_SLOTS.find((t) => t.id === slot.slot)?.label || slot.slot;
  return `${day}${time}`;
}

export function slotKey(slot) {
  return `${slot.day}:${slot.slot}`;
}

export function allSlotCombos() {
  const rows = [];
  for (const day of DAY_TYPES) {
    for (const time of TIME_SLOTS) {
      rows.push({
        day: day.id,
        slot: time.id,
        label: `${day.label}${time.label}`,
      });
    }
  }
  return rows;
}

export function canonicalCity(raw) {
  const n = String(raw || '').replace(/台/g, '臺');
  if (n.includes('臺北')) return '臺北市';
  if (n.includes('新北')) return '新北市';
  if (n.includes('臺南')) return '臺南市';
  if (n.includes('高雄')) return '高雄市';
  return null;
}

export function isTrialCity(city) {
  return TRIAL_CITIES.includes(city);
}
