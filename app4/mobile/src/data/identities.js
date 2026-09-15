/** Fixed identity list (~50 + other). Ids are stable; labels are UI-only. */
export const IDENTITIES = [
  { id: 'teacher', label: '老師' },
  { id: 'student', label: '學生' },
  { id: 'engineer', label: '工程師' },
  { id: 'designer', label: '設計師' },
  { id: 'product_manager', label: '產品經理' },
  { id: 'data_analyst', label: '資料分析師' },
  { id: 'doctor', label: '醫師' },
  { id: 'nurse', label: '護理師' },
  { id: 'pharmacist', label: '藥師' },
  { id: 'lawyer', label: '律師' },
  { id: 'accountant', label: '會計師' },
  { id: 'civil_servant', label: '公務員' },
  { id: 'soldier', label: '軍人' },
  { id: 'police', label: '警察' },
  { id: 'firefighter', label: '消防人員' },
  { id: 'chef', label: '廚師' },
  { id: 'barista', label: '咖啡師' },
  { id: 'salesperson', label: '業務／銷售' },
  { id: 'marketer', label: '行銷人員' },
  { id: 'hr', label: '人資' },
  { id: 'finance', label: '金融從業' },
  { id: 'insurance', label: '保險從業' },
  { id: 'real_estate', label: '房仲' },
  { id: 'architect', label: '建築師' },
  { id: 'interior', label: '室內設計師' },
  { id: 'journalist', label: '記者' },
  { id: 'writer', label: '作家／文字工作者' },
  { id: 'translator', label: '翻譯' },
  { id: 'photographer', label: '攝影師' },
  { id: 'videographer', label: '影像工作者' },
  { id: 'musician', label: '音樂人' },
  { id: 'artist', label: '藝術家' },
  { id: 'athlete', label: '運動員／教練' },
  { id: 'fitness', label: '健身教練' },
  { id: 'beautician', label: '美容／美髮' },
  { id: 'driver', label: '司機／運輸' },
  { id: 'logistics', label: '物流倉儲' },
  { id: 'farmer', label: '農漁牧' },
  { id: 'factory', label: '製造業作業' },
  { id: 'electrician', label: '水電／技術職人' },
  { id: 'entrepreneur', label: '創業者' },
  { id: 'freelancer', label: '自由工作者' },
  { id: 'researcher', label: '研究員' },
  { id: 'social_worker', label: '社工' },
  { id: 'counselor', label: '諮商師' },
  { id: 'mother', label: '母親' },
  { id: 'father', label: '父親' },
  { id: 'caregiver', label: '照顧者' },
  { id: 'retiree', label: '退休人士' },
  { id: 'job_seeker', label: '求職者' },
  { id: 'other', label: '其他' },
];

const LABEL_BY_ID = Object.fromEntries(IDENTITIES.map((x) => [x.id, x.label]));

export function labelForIdentity(id) {
  return LABEL_BY_ID[id] || id || '未知';
}

export function labelsForIdentities(ids) {
  return (ids || []).map(labelForIdentity);
}

export const REPORT_REASONS = [
  '騷擾或不當訊息',
  '疑似假身份',
  'LINE 內容不當',
  '詐騙／廣告',
  '其他',
];

export const FREE_DAILY_MATCHES = 1;
export const PAID_DAILY_MATCHES = 5;
export const MAX_OWN = 5;
export const MIN_OWN = 1;
export const MAX_INTEREST = 2;
export const MIN_INTEREST = 1;
export const INTEREST_COOLDOWN_MS = 168 * 60 * 60 * 1000;
