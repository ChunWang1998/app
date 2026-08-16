import { GATHERING_CAP } from './constants';

/** Parks that can host a meetup. Date is always within the next week. */
const SEED = [
  {
    id: 'g-tp-daan',
    city: '臺北市',
    park: '大安森林公園',
    hostId: 'tp-1',
    hostName: '拿鐵',
    fee: 50,
    baseJoined: 4,
    dayOffset: 2,
    time: '09:00',
    note: '牽繩平行走，現場跟主揪繳報名費',
  },
  {
    id: 'g-ntpc-square',
    city: '新北市',
    park: '縣民廣場',
    hostId: 'ntpc-1',
    hostName: '歐包',
    fee: 30,
    baseJoined: 6,
    dayOffset: 3,
    time: '17:30',
    note: '傍晚短聚，10 人內',
  },
  {
    id: 'g-tn-park',
    city: '臺南市',
    park: '台南公園',
    hostId: 'tn-1',
    hostName: '芋頭',
    fee: 40,
    baseJoined: 3,
    dayOffset: 1,
    time: '08:30',
    note: '早上散步，現場繳費',
  },
  {
    id: 'g-kh-aozidi',
    city: '高雄市',
    park: '凹子底森林公園',
    hostId: 'kh-1',
    hostName: '麻糬',
    fee: 50,
    baseJoined: 5,
    dayOffset: 4,
    time: '16:00',
    note: '下午樹蔭下集合',
  },
];

function dateForOffset(offset) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

function formatDate(d) {
  const w = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}（週${w}）`;
}

export function gatheringsForCity(city) {
  return SEED.filter((g) => g.city === city).map((g) => {
    const date = dateForOffset(g.dayOffset);
    return {
      ...g,
      cap: GATHERING_CAP,
      dateISO: date.toISOString(),
      dateLabel: formatDate(date),
      needsHost: true,
      payOnSite: true,
    };
  });
}

export function findGathering(id) {
  for (const city of ['臺北市', '新北市', '臺南市', '高雄市']) {
    const hit = gatheringsForCity(city).find((g) => g.id === id);
    if (hit) return hit;
  }
  return null;
}
