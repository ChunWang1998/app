export const FOUNDER_CAP = 100;
export const MAX_CHAT = 20;
export const MAX_SLOTS = 3;
export const MAX_PLACES = 3;
export const MAX_DOGS = 3;
export const MAX_INTRO = 50;
export const MAX_GATHERING_NAME = 10;
export const MAX_GATHERING_INTRO = 50;
export const GATHERING_MIN_DAYS_AHEAD = 1;
export const GATHERING_MAX_DAYS_AHEAD = 7;

/** All 22 counties / cities in Taiwan (手選，非 GPS). */
export const TAIWAN_CITIES = [
  '基隆市',
  '臺北市',
  '新北市',
  '桃園市',
  '新竹市',
  '新竹縣',
  '苗栗縣',
  '臺中市',
  '彰化縣',
  '南投縣',
  '雲林縣',
  '嘉義市',
  '嘉義縣',
  '臺南市',
  '高雄市',
  '屏東縣',
  '宜蘭縣',
  '花蓮縣',
  '臺東縣',
  '澎湖縣',
  '金門縣',
  '連江縣',
];

/** @deprecated use TAIWAN_CITIES */
export const TRIAL_CITIES = TAIWAN_CITIES;

/** NLSC county codes — only used as API path, not as a district list. */
export const COUNTY_CODE = {
  基隆市: 'C',
  臺北市: 'A',
  新北市: 'F',
  桃園市: 'H',
  新竹市: 'O',
  新竹縣: 'J',
  苗栗縣: 'K',
  臺中市: 'B',
  彰化縣: 'N',
  南投縣: 'M',
  雲林縣: 'P',
  嘉義市: 'I',
  嘉義縣: 'Q',
  臺南市: 'D',
  高雄市: 'E',
  屏東縣: 'T',
  宜蘭縣: 'G',
  花蓮縣: 'U',
  臺東縣: 'V',
  澎湖縣: 'X',
  金門縣: 'W',
  連江縣: 'Z',
};

export function taiwanCityFilterOptions() {
  return [
    { value: '', label: '全台' },
    ...TAIWAN_CITIES.map((c) => ({ value: c, label: c })),
  ];
}

export function taiwanCityPickOptions() {
  return TAIWAN_CITIES.map((c) => ({ value: c, label: c }));
}

export const PERSONALITIES = ['友善', '怕生', '活力', '慢熱'];
export const MAX_PERSONALITIES = 4;
export const MAX_PERSONALITY_LEN = 8;

export const SIZES = ['小型', '中型', '大型'];

/** Spec: warn when size differs by two levels (small vs large). */
export function sizesTwoLevelsApart(a, b) {
  const i = SIZES.indexOf(a);
  const j = SIZES.indexOf(b);
  if (i < 0 || j < 0) return false;
  return Math.abs(i - j) >= 2;
}

export const AGE_RANGES = ['未滿 1 歲', '1–3 歲', '4–7 歲', '8 歲以上'];

export const DAY_TYPES = [
  { id: 'weekday', label: '平日' },
  { id: 'weekend', label: '假日' },
];

export const TIME_SLOTS = [
  { id: 'morning', label: '早' },
  { id: 'afternoon', label: '中' },
  { id: 'evening', label: '晚' },
];

export const PLAY_OPTIONS = [
  { id: 'play', label: '可一起玩' },
  { id: 'parallel', label: '需慢熱牽繩平行走' },
];

export const GATHERING_TYPES = [
  '趣味競賽',
  '野餐',
  '散步',
  '動物餐廳',
  '動物咖啡廳',
  '爬山',
  '單身狗',
];

export const GATHERING_FEE_PRESETS = [0, 50, 100, 200];

export const GATHERING_CAPACITY_PRESETS = [4, 6, 8, 10];

export const DEFAULT_GATHERING_CAPACITY = 8;

/** Shown once when a Connect succeeds — not a profile checklist. */
export const CONNECT_REMINDER =
  '見面提醒：雙方主人請全程在場。第一次請約公共公園，不要約私人庭院或室內。全程牽繩，直到雙方口頭同意才靠近。體型差大時預設平行走、不互相撲。若任一方的狗出現壓力訊號（躲、吠、低吼、身體僵硬），立刻拉開並結束當次。合照需當下口頭同意；夜間不要用閃光燈直射眼睛。現場怎麼走由你們自己決定。';

function normalizeSlotId(id) {
  if (id === 'noon') return 'afternoon';
  if (id === 'night') return 'evening';
  return id;
}

export function normalizeSlot(slot) {
  const next = { ...slot, slot: normalizeSlotId(slot.slot) };
  next.label = slotLabel(next);
  return next;
}

export function slotLabel(slot) {
  const day = DAY_TYPES.find((d) => d.id === slot.day)?.label || slot.day;
  const time =
    TIME_SLOTS.find((t) => t.id === normalizeSlotId(slot.slot))?.label ||
    slot.slot;
  return `${day}${time}`;
}

export function slotKey(slot) {
  return `${slot.day}:${normalizeSlotId(slot.slot)}`;
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

export function formatGatheringDate(d) {
  const w = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}（週${w}）`;
}

export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isGatheringEnded(dateISO) {
  return startOfDay(dateISO) < startOfDay(new Date());
}

export function isGatheringDateAllowed(dateISO, now = new Date()) {
  const picked = startOfDay(dateISO).getTime();
  const today = startOfDay(now);
  const min = new Date(today);
  min.setDate(min.getDate() + GATHERING_MIN_DAYS_AHEAD);
  const max = new Date(today);
  max.setDate(max.getDate() + GATHERING_MAX_DAYS_AHEAD);
  return picked >= min.getTime() && picked <= max.getTime();
}
