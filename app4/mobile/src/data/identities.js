/**
 * Identity taxonomy — 104 人力銀行式大類 → 小類 → 職稱。
 * Leaf `id` values are stable for Supabase storage; labels are UI-only.
 */

/** @typedef {{ id: string, label: string }} IdentityLeaf */
/** @typedef {{ id: string, label: string, items: IdentityLeaf[] }} IdentityGroup */
/** @typedef {{ id: string, label: string, groups: IdentityGroup[] }} IdentityCategory */

/** @type {IdentityCategory[]} */
export const IDENTITY_CATEGORIES = [
  {
    id: 'it',
    label: '資訊科技',
    groups: [
      {
        id: 'it_dev',
        label: '軟體／Internet',
        items: [
          { id: 'engineer', label: '工程師' },
          { id: 'product_manager', label: '產品經理' },
          { id: 'data_analyst', label: '資料分析師' },
        ],
      },
      {
        id: 'it_design',
        label: '設計／UX',
        items: [{ id: 'designer', label: '設計師' }],
      },
      {
        id: 'it_startup',
        label: '創業／自由接案',
        items: [
          { id: 'entrepreneur', label: '創業者' },
          { id: 'freelancer', label: '自由工作者' },
        ],
      },
    ],
  },
  {
    id: 'finance',
    label: '金融保險',
    groups: [
      {
        id: 'finance_banking',
        label: '金融',
        items: [
          { id: 'finance', label: '金融從業' },
          { id: 'accountant', label: '會計師' },
        ],
      },
      {
        id: 'finance_insurance',
        label: '保險',
        items: [{ id: 'insurance', label: '保險從業' }],
      },
    ],
  },
  {
    id: 'healthcare',
    label: '醫療保健',
    groups: [
      {
        id: 'healthcare_medical',
        label: '醫療',
        items: [
          { id: 'doctor', label: '醫師' },
          { id: 'nurse', label: '護理師' },
          { id: 'pharmacist', label: '藥師' },
        ],
      },
      {
        id: 'healthcare_wellness',
        label: '保健運動',
        items: [
          { id: 'fitness', label: '健身教練' },
          { id: 'athlete', label: '運動員／教練' },
        ],
      },
    ],
  },
  {
    id: 'education',
    label: '教育學術',
    groups: [
      {
        id: 'education_school',
        label: '學校',
        items: [
          { id: 'teacher', label: '老師' },
          { id: 'student', label: '學生' },
        ],
      },
      {
        id: 'education_research',
        label: '研究',
        items: [{ id: 'researcher', label: '研究員' }],
      },
    ],
  },
  {
    id: 'marketing',
    label: '設計行銷',
    groups: [
      {
        id: 'marketing_biz',
        label: '行銷業務',
        items: [
          { id: 'marketer', label: '行銷人員' },
          { id: 'salesperson', label: '業務／銷售' },
        ],
      },
      {
        id: 'marketing_media',
        label: '媒體／文字',
        items: [
          { id: 'journalist', label: '記者' },
          { id: 'writer', label: '作家／文字工作者' },
          { id: 'translator', label: '翻譯' },
          { id: 'photographer', label: '攝影師' },
          { id: 'videographer', label: '影像工作者' },
        ],
      },
    ],
  },
  {
    id: 'engineering',
    label: '製造工程',
    groups: [
      {
        id: 'engineering_build',
        label: '建築／室內',
        items: [
          { id: 'architect', label: '建築師' },
          { id: 'interior', label: '室內設計師' },
        ],
      },
      {
        id: 'engineering_mfg',
        label: '製造／技術職',
        items: [
          { id: 'factory', label: '製造業作業' },
          { id: 'electrician', label: '水電／技術職人' },
        ],
      },
    ],
  },
  {
    id: 'realestate',
    label: '不動產',
    groups: [
      {
        id: 'realestate_sales',
        label: '仲介／開發',
        items: [{ id: 'real_estate', label: '房仲' }],
      },
    ],
  },
  {
    id: 'hospitality',
    label: '餐旅生活',
    groups: [
      {
        id: 'hospitality_food',
        label: '餐飲',
        items: [
          { id: 'chef', label: '廚師' },
          { id: 'barista', label: '咖啡師' },
        ],
      },
      {
        id: 'hospitality_beauty',
        label: '美容美髮',
        items: [{ id: 'beautician', label: '美容／美髮' }],
      },
    ],
  },
  {
    id: 'admin',
    label: '行政人資',
    groups: [
      {
        id: 'admin_hr',
        label: '人資',
        items: [{ id: 'hr', label: '人資' }],
      },
      {
        id: 'admin_gov',
        label: '公務',
        items: [{ id: 'civil_servant', label: '公務員' }],
      },
    ],
  },
  {
    id: 'public',
    label: '公職軍警',
    groups: [
      {
        id: 'public_safety',
        label: '軍警消防',
        items: [
          { id: 'soldier', label: '軍人' },
          { id: 'police', label: '警察' },
          { id: 'firefighter', label: '消防人員' },
        ],
      },
      {
        id: 'public_legal',
        label: '法律',
        items: [{ id: 'lawyer', label: '律師' }],
      },
    ],
  },
  {
    id: 'creative',
    label: '文創藝術',
    groups: [
      {
        id: 'creative_arts',
        label: '藝術／音樂',
        items: [
          { id: 'musician', label: '音樂人' },
          { id: 'artist', label: '藝術家' },
        ],
      },
    ],
  },
  {
    id: 'transport',
    label: '交通物流',
    groups: [
      {
        id: 'transport_ops',
        label: '運輸',
        items: [{ id: 'driver', label: '司機／運輸' }],
      },
      {
        id: 'transport_logistics',
        label: '物流倉儲',
        items: [{ id: 'logistics', label: '物流倉儲' }],
      },
    ],
  },
  {
    id: 'agriculture',
    label: '農漁牧',
    groups: [
      {
        id: 'agriculture_farm',
        label: '農漁牧',
        items: [{ id: 'farmer', label: '農漁牧' }],
      },
    ],
  },
  {
    id: 'social',
    label: '社福照護',
    groups: [
      {
        id: 'social_care',
        label: '社工／諮商',
        items: [
          { id: 'social_worker', label: '社工' },
          { id: 'counselor', label: '諮商師' },
          { id: 'caregiver', label: '照顧者' },
        ],
      },
    ],
  },
  {
    id: 'other',
    label: '其他',
    groups: [
      {
        id: 'other_life',
        label: '生活／求職',
        items: [
          { id: 'mother', label: '母親' },
          { id: 'father', label: '父親' },
          { id: 'retiree', label: '退休人士' },
          { id: 'job_seeker', label: '求職者' },
          { id: 'other', label: '其他' },
        ],
      },
    ],
  },
];

/** Flat list derived from taxonomy (backward compatible). */
export const IDENTITIES = IDENTITY_CATEGORIES.flatMap((cat) =>
  cat.groups.flatMap((group) => group.items),
);

const LABEL_BY_ID = Object.fromEntries(IDENTITIES.map((x) => [x.id, x.label]));

/** Breadcrumb path for display, e.g. 「資訊科技 › 軟體／Internet › 工程師」 */
const PATH_BY_ID = (() => {
  const map = {};
  for (const cat of IDENTITY_CATEGORIES) {
    for (const group of cat.groups) {
      for (const item of group.items) {
        map[item.id] = `${cat.label} › ${group.label} › ${item.label}`;
      }
    }
  }
  return map;
})();

export function labelForIdentity(id) {
  return LABEL_BY_ID[id] || id || '未知';
}

export function pathForIdentity(id) {
  return PATH_BY_ID[id] || labelForIdentity(id);
}

export function labelsForIdentities(ids) {
  return (ids || []).map(labelForIdentity);
}

export const REPORT_REASONS = [
  '騷擾或不當訊息',
  '疑似假身份',
  '聊天內容不當',
  '詐騙／廣告',
  '其他',
];

export const CHAT_CAP = 20;
export const FREE_DAILY_MATCHES = 1;
export const PAID_DAILY_MATCHES = 5;
export const MAX_OWN = 5;
export const MIN_OWN = 1;
export const MAX_INTEREST = 2;
export const MIN_INTEREST = 1;
export const INTEREST_COOLDOWN_MS = 168 * 60 * 60 * 1000;
