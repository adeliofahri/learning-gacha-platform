export const SESSION_COOKIE = "lgp_session";
export const SESSION_TTL_DAYS = 7;
export const PAGE_SIZE = 20;
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export const DIFFICULTY_LABEL = {
  EASY: "Mudah",
  MEDIUM: "Sedang",
  HARD: "Sulit",
  EXPERT: "Ahli",
} as const;

export const QUESTION_TYPE_LABEL = {
  MULTIPLE_CHOICE: "Pilihan ganda",
  MULTIPLE_SELECT: "Pilihan ganda kompleks",
  TRUE_FALSE: "Benar-Salah",
  SHORT_ANSWER: "Isian singkat",
} as const;

export const CONTENT_STATUS_LABEL = {
  DRAFT: "Draft",
  PUBLISHED: "Dipublikasikan",
  ARCHIVED: "Diarsipkan",
} as const;

export const QUESTION_PROGRESS_LABEL = {
  UNSOLVED: "Belum dicoba",
  ATTEMPTED: "Sudah dicoba",
  PENDING_REVIEW: "Menunggu review",
  SOLVED: "Selesai",
} as const;

export const TRANSACTION_TYPE_LABEL = {
  QUESTION_REWARD: "Bounty soal",
  EVENT_BONUS: "Bonus event",
  ADMIN_ADJUSTMENT: "Penyesuaian admin",
  GACHA_SPEND: "Gacha",
  DUPLICATE_CONVERSION: "Konversi duplikat",
  SHARD_SPEND: "Penggunaan shard",
  CHARACTER_DELETE_REFUND: "Refund penghapusan karakter",
  DAILY_LOGIN_REWARD: "Reward login harian",
} as const;

export const PULL_TYPE_LABEL = {
  SINGLE: "Single",
  TEN_PULL: "10× Pull",
  STEP_UP: "Step-Up",
} as const;

export const DEMO_DIFFICULTY_BOUNTY = { EASY: 5, MEDIUM: 10, HARD: 20, EXPERT: 35 } as const;
export const DEMO_DUPLICATE_SHARDS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 5,
  4: 10,
  5: 25,
  6: 50,
};
export const DEMO_STEP_UP_PRICES = [100, 150, 200, 250, 300] as const;
