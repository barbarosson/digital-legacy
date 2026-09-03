export const ASSET_CATEGORIES = {
  hesap: "Account & service",
  belge: "Document",
  talimat: "Instruction",
  sifre: "Password vault",
  diger: "Other",
} as const;

export const PRIORITIES = {
  dusuk: "Low",
  orta: "Medium",
  yuksek: "High",
} as const;

export const DELIVERY_TYPES = {
  hemen: "Deliver now",
  hareketsizlik: "After inactivity",
  manuel: "Manual approval",
} as const;

export const MESSAGE_STATUSES = {
  taslak: "Draft",
  hazir: "Ready",
  teslim: "Delivered",
} as const;

export const DELIVERY_TRIGGERS = {
  hemen: "Immediate",
  hareketsizlik: "Inactivity",
  manuel: "Manual",
} as const;

export const DEFAULT_INACTIVITY_DAYS = 90;
export const MIN_INACTIVITY_DAYS = 7;
export const MAX_INACTIVITY_DAYS = 3650;

export const DEFAULT_WARNING_WEEKS = 4;
export const MIN_WARNING_WEEKS = 0;
export const MAX_WARNING_WEEKS = 12;

export const MOODS = {
  mutlu: { label: "Happy", emoji: "😊" },
  huzurlu: { label: "Peaceful", emoji: "😌" },
  heyecanli: { label: "Excited", emoji: "🤩" },
  notr: { label: "Neutral", emoji: "😐" },
  yorgun: { label: "Tired", emoji: "😪" },
  uzgun: { label: "Sad", emoji: "😢" },
  ozlem: { label: "Longing", emoji: "🥹" },
  minnettar: { label: "Grateful", emoji: "🙏" },
} as const;

export type MoodKey = keyof typeof MOODS;

export const RELATIONSHIPS = [
  "Spouse",
  "Child",
  "Parent",
  "Sibling",
  "Friend",
  "Lawyer",
  "Other",
] as const;

export const RELATIONSHIP_KEYS = [
  "es",
  "cocuk",
  "anneBaba",
  "kardes",
  "arkadas",
  "avukat",
  "diger",
] as const;
