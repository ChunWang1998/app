import { formatGatheringDate, startOfDay } from './constants';

function dateForOffset(offset) {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + offset);
  return d;
}

const SEED = [
  {
    id: 'g-tp-picnic',
    city: '臺北市',
    name: '大安野餐',
    place: '大安森林公園',
    type: '野餐',
    fee: 50,
    intro: '牽繩野餐，自備墊子與水。',
    lineGroupUrl: 'https://line.me/ti/g/demo-daan',
    hostId: 'tp-1',
    hostName: '拿鐵',
    dayOffset: 2,
    baseJoined: 4,
  },
  {
    id: 'g-tp-cafe',
    city: '臺北市',
    name: '信義咖啡',
    place: '動物友善咖啡廳',
    type: '動物咖啡廳',
    fee: 100,
    intro: '室內座位有限，請先在群組報到。',
    lineGroupUrl: 'https://line.me/ti/g/demo-cafe',
    hostId: 'tp-2',
    hostName: '雲朵',
    dayOffset: 5,
    baseJoined: 2,
  },
  {
    id: 'g-ntpc-walk',
    city: '新北市',
    name: '板橋散步',
    place: '縣民廣場',
    type: '散步',
    fee: 0,
    intro: '傍晚牽繩散步，免費參加。',
    lineGroupUrl: 'https://line.me/ti/g/demo-banqiao',
    hostId: 'ntpc-1',
    hostName: '歐包',
    dayOffset: 3,
    baseJoined: 6,
  },
  {
    id: 'g-tn-dine',
    city: '臺南市',
    name: '東區餐廳',
    place: '寵物餐廳',
    type: '動物餐廳',
    fee: 200,
    intro: '用餐請先看群組座位表。',
    lineGroupUrl: 'https://line.me/ti/g/demo-tainan',
    hostId: 'tn-1',
    hostName: '芋頭',
    dayOffset: 1,
    baseJoined: 3,
  },
  {
    id: 'g-kh-hike',
    city: '高雄市',
    name: '壽山走走',
    place: '壽山動物園附近步道',
    type: '爬山',
    fee: 0,
    intro: '緩坡散步，量力而為。',
    lineGroupUrl: 'https://line.me/ti/g/demo-shoushan',
    hostId: 'kh-1',
    hostName: '麻糬',
    dayOffset: 4,
    baseJoined: 5,
  },
  {
    id: 'g-kh-single',
    city: '高雄市',
    name: '左營單身狗',
    place: '凹子底森林公園',
    type: '單身狗',
    fee: 50,
    intro: '已結束的示範場，可看按讚流程。',
    lineGroupUrl: 'https://line.me/ti/g/demo-zuoying',
    hostId: 'kh-1',
    hostName: '麻糬',
    dayOffset: -1,
    baseJoined: 7,
    allowJoinAfterEnd: true,
  },
];

export function seedGatheringRows() {
  return SEED.map((g) => {
    const date = dateForOffset(g.dayOffset);
    return {
      ...g,
      isSeed: true,
      dateISO: date.toISOString(),
      dateLabel: formatGatheringDate(date),
      createdAt: '2026-07-01T00:00:00.000Z',
    };
  });
}

export function seedGatheringsForCity(city) {
  return seedGatheringRows().filter((g) => g.city === city);
}

export function findSeedGathering(id) {
  return seedGatheringRows().find((g) => g.id === id) || null;
}
