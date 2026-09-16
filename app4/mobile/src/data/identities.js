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
    id: 'management',
    label: '經營管理',
    groups: [
      {
        id: 'management_exec',
        label: '管理職',
        items: [
          { id: 'manager', label: '經營管理主管' },
          { id: 'management_trainee', label: '儲備幹部' },
          { id: 'executive_assistant', label: '主管特別助理' },
          { id: 'entrepreneur', label: '創業者' },
        ],
      },
    ],
  },
  {
    id: 'admin',
    label: '人資行政總務',
    groups: [
      {
        id: 'admin_hr',
        label: '人資',
        items: [
          { id: 'hr', label: '人資' },
          { id: 'hr_assistant', label: '人資助理' },
          { id: 'trainer', label: '教育訓練人員' },
        ],
      },
      {
        id: 'admin_general',
        label: '行政總務',
        items: [
          { id: 'admin_staff', label: '行政人員' },
          { id: 'general_affairs', label: '總務' },
          { id: 'secretary', label: '秘書' },
          { id: 'receptionist', label: '櫃檯接待人員' },
          { id: 'civil_servant', label: '公務員' },
        ],
      },
    ],
  },
  {
    id: 'legal',
    label: '法務智財',
    groups: [
      {
        id: 'legal_practice',
        label: '法務',
        items: [
          { id: 'lawyer', label: '律師' },
          { id: 'legal_officer', label: '法務人員' },
          { id: 'compliance', label: '法遵人員' },
        ],
      },
      {
        id: 'legal_ip',
        label: '智財',
        items: [
          { id: 'patent_engineer', label: '專利工程師' },
          { id: 'trademark_specialist', label: '商標／專利人員' },
        ],
      },
    ],
  },
  {
    id: 'finance',
    label: '財務會計稅務',
    groups: [
      {
        id: 'finance_banking',
        label: '金融',
        items: [
          { id: 'finance', label: '金融從業' },
          { id: 'financial_analyst', label: '財務分析／財務人員' },
        ],
      },
      {
        id: 'finance_accounting',
        label: '會計／稅務',
        items: [
          { id: 'accountant', label: '會計師' },
          { id: 'bookkeeper', label: '記帳／出納／一般會計' },
          { id: 'auditor', label: '查帳／審計人員' },
          { id: 'tax_specialist', label: '稅務人員' },
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
    id: 'marketing',
    label: '行銷企劃專案',
    groups: [
      {
        id: 'marketing_biz',
        label: '行銷企劃',
        items: [
          { id: 'marketer', label: '行銷人員' },
          { id: 'brand_planner', label: '產品行銷企劃' },
          { id: 'event_planner', label: '活動企劃' },
          { id: 'digital_marketer', label: '網站行銷企劃' },
          { id: 'market_researcher', label: '市場調查／市場分析' },
          { id: 'social_media_editor', label: '小編' },
        ],
      },
      {
        id: 'marketing_pm',
        label: '專案／產品',
        items: [
          { id: 'product_manager', label: '產品經理' },
          { id: 'project_manager', label: '專案經理' },
          { id: 'product_planner', label: '產品企劃' },
          { id: 'sustainability_manager', label: '永續管理師' },
        ],
      },
      {
        id: 'marketing_media',
        label: '媒體公關',
        items: [
          { id: 'pr_specialist', label: '媒體公關人員' },
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
    id: 'sales_service',
    label: '客服門市業務',
    groups: [
      {
        id: 'sales_service_cs',
        label: '客服',
        items: [
          { id: 'customer_service', label: '客服人員' },
          { id: 'call_center', label: '電話客服' },
        ],
      },
      {
        id: 'sales_service_retail',
        label: '門市',
        items: [
          { id: 'store_manager', label: '店長／賣場管理人員' },
          { id: 'retail_staff', label: '門市／店員／專櫃人員' },
          { id: 'cashier', label: '售票／收銀人員' },
        ],
      },
      {
        id: 'sales_service_sales',
        label: '業務／貿易',
        items: [
          { id: 'salesperson', label: '業務／銷售' },
          { id: 'domestic_sales', label: '國內業務' },
          { id: 'international_sales', label: '國外業務' },
          { id: 'trade_specialist', label: '國貿人員' },
          { id: 'medical_sales', label: '醫藥業務代表' },
        ],
      },
    ],
  },
  {
    id: 'it',
    label: '資訊軟體系統',
    groups: [
      {
        id: 'it_dev',
        label: '軟體開發',
        items: [
          { id: 'engineer', label: '軟體工程師' },
          { id: 'frontend_engineer', label: '前端工程師' },
          { id: 'backend_engineer', label: '後端工程師' },
          { id: 'fullstack_engineer', label: '全端工程師' },
          { id: 'ios_engineer', label: 'iOS 工程師' },
          { id: 'android_engineer', label: 'Android 工程師' },
          { id: 'data_analyst', label: '資料分析師' },
          { id: 'data_engineer', label: '資料工程師' },
          { id: 'data_scientist', label: '資料科學家' },
          { id: 'ai_engineer', label: 'AI 工程師' },
        ],
      },
      {
        id: 'it_ops',
        label: 'MIS／資安',
        items: [
          { id: 'mis', label: 'MIS 程式設計師' },
          { id: 'network_admin', label: '網路管理工程師' },
          { id: 'security_engineer', label: '資安工程師' },
          { id: 'cloud_engineer', label: '雲端工程師' },
        ],
      },
      {
        id: 'it_design',
        label: '設計／UX',
        items: [
          { id: 'designer', label: '設計師' },
          { id: 'ui_designer', label: 'UI 設計師' },
          { id: 'ux_designer', label: 'UX 設計師' },
        ],
      },
      {
        id: 'it_startup',
        label: '創業／自由接案',
        items: [{ id: 'freelancer', label: '自由工作者' }],
      },
    ],
  },
  {
    id: 'rd',
    label: '研發',
    groups: [
      {
        id: 'rd_hardware',
        label: '硬體／電機',
        items: [
          { id: 'hardware_engineer', label: '硬體研發工程師' },
          { id: 'electrical_engineer', label: '電機技師／工程師' },
          { id: 'mechanical_engineer', label: '機械工程師' },
          { id: 'electronics_engineer', label: '電子工程師' },
        ],
      },
      {
        id: 'rd_semiconductor',
        label: '半導體／光電',
        items: [
          { id: 'semiconductor_engineer', label: '半導體工程師' },
          { id: 'ic_designer', label: 'IC 設計工程師' },
          { id: 'optical_engineer', label: '光電工程師' },
        ],
      },
      {
        id: 'rd_bio',
        label: '生技／材料',
        items: [
          { id: 'biotech_researcher', label: '生物科技研發人員' },
          { id: 'materials_researcher', label: '材料研發人員' },
          { id: 'food_rd', label: '食品研發人員' },
          { id: 'researcher', label: '研究員' },
        ],
      },
    ],
  },
  {
    id: 'manufacturing',
    label: '生產製造',
    groups: [
      {
        id: 'manufacturing_mgmt',
        label: '生產管理',
        items: [
          { id: 'production_manager', label: '生產管理主管' },
          { id: 'plant_manager', label: '工廠主管' },
          { id: 'production_planner', label: '生管' },
        ],
      },
      {
        id: 'manufacturing_process',
        label: '製程／設備',
        items: [
          { id: 'process_engineer', label: '生產技術／製程工程師' },
          { id: 'equipment_engineer', label: '生產設備工程師' },
          { id: 'factory', label: '製造業作業' },
        ],
      },
      {
        id: 'manufacturing_qc',
        label: '品保／品管',
        items: [
          { id: 'qa_engineer', label: '品管／品保工程師' },
          { id: 'qc_inspector', label: '品管／檢驗人員' },
        ],
      },
    ],
  },
  {
    id: 'technician',
    label: '操作技術維修',
    groups: [
      {
        id: 'technician_ops',
        label: '操作／技術',
        items: [
          { id: 'cnc_operator', label: 'CNC 機台操作人員' },
          { id: 'machine_operator', label: '作業員／包裝員' },
          { id: 'electrician', label: '水電／技術職人' },
          { id: 'hvac_technician', label: '空調冷凍技術人員' },
          { id: 'auto_technician', label: '汽車／機車引擎技術人員' },
        ],
      },
      {
        id: 'technician_service',
        label: '售後／維修',
        items: [
          { id: 'field_service', label: '產品售後技術服務' },
          { id: 'repair_technician', label: '產品維修人員' },
          { id: 'fae_engineer', label: 'FAE 工程師' },
        ],
      },
    ],
  },
  {
    id: 'engineering',
    label: '營建製圖',
    groups: [
      {
        id: 'engineering_build',
        label: '建築／室內',
        items: [
          { id: 'architect', label: '建築師' },
          { id: 'interior', label: '室內設計師' },
          { id: 'cad_engineer', label: 'CAD／CAM 工程師' },
        ],
      },
      {
        id: 'engineering_civil',
        label: '土木／營建',
        items: [
          { id: 'civil_engineer', label: '土木技師／工程師' },
          { id: 'construction_supervisor', label: '工地監工／主任' },
          { id: 'plumber', label: '水電工' },
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
        items: [
          { id: 'real_estate', label: '房仲' },
          { id: 'property_developer', label: '不動產／商場開發人員' },
        ],
      },
    ],
  },
  {
    id: 'design',
    label: '傳播藝術設計',
    groups: [
      {
        id: 'design_visual',
        label: '視覺／平面',
        items: [
          { id: 'graphic_designer', label: '平面設計／美編' },
          { id: 'web_designer', label: '網頁設計師' },
          { id: 'visual_designer', label: '視覺設計師' },
          { id: 'industrial_designer', label: '工業設計' },
        ],
      },
      {
        id: 'creative_arts',
        label: '藝術／影音',
        items: [
          { id: 'musician', label: '音樂人' },
          { id: 'artist', label: '藝術家' },
          { id: 'video_editor', label: '剪輯師' },
          { id: 'animator', label: '多媒體動畫設計師' },
        ],
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
          { id: 'nutritionist', label: '營養師' },
          { id: 'medical_technologist', label: '醫事檢驗／放射技師' },
        ],
      },
      {
        id: 'healthcare_wellness',
        label: '保健運動',
        items: [
          { id: 'fitness', label: '健身教練' },
          { id: 'athlete', label: '運動員／教練' },
          { id: 'massage_therapist', label: '按摩／推拿師' },
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
          { id: 'tutor', label: '補習班導師' },
        ],
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
          { id: 'bartender', label: '調酒師／吧台人員' },
          { id: 'restaurant_staff', label: '餐飲服務生' },
        ],
      },
      {
        id: 'hospitality_hotel',
        label: '飯店／旅遊',
        items: [
          { id: 'hotel_staff', label: '飯店工作人員' },
          { id: 'travel_agent', label: 'OP／旅行社人員' },
        ],
      },
      {
        id: 'hospitality_beauty',
        label: '美容美髮',
        items: [
          { id: 'beautician', label: '美容／美髮' },
          { id: 'spa_therapist', label: '美療／芳療師' },
        ],
      },
    ],
  },
  {
    id: 'transport',
    label: '資材物流運輸',
    groups: [
      {
        id: 'transport_ops',
        label: '運輸',
        items: [
          { id: 'driver', label: '司機／運輸' },
          { id: 'courier', label: '快遞' },
        ],
      },
      {
        id: 'transport_logistics',
        label: '物流倉儲',
        items: [
          { id: 'logistics', label: '物流倉儲' },
          { id: 'warehouse', label: '倉管' },
          { id: 'purchasing', label: '採購人員' },
        ],
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
          { id: 'security_guard', label: '保全人員／警衛' },
        ],
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
        items: [
          { id: 'farmer', label: '農漁牧' },
          { id: 'gardener', label: '花藝／園藝人員' },
        ],
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
          { id: 'consultant', label: '顧問' },
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
