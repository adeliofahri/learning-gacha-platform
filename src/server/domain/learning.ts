import type { AttemptStatus, Difficulty } from "@prisma/client";

export type QuestionProgressStatus = "UNSOLVED" | "ATTEMPTED" | "PENDING_REVIEW" | "SOLVED";
export type DifficultyBountyConfig = Record<Difficulty, number>;

/** Bounty default untuk soal baru berdasarkan konfigurasi difficulty. */
export function defaultBounty(difficulty: Difficulty, config: DifficultyBountyConfig): number {
  const value = config[difficulty];
  if (!Number.isInteger(value) || value < 0)
    throw new Error(`Bounty tidak valid untuk ${difficulty}`);
  return value;
}

/** Reward yang diberikan untuk jawaban benar: hanya jika soal belum pernah solved. */
export function bountyForCorrectAnswer(params: { alreadySolved: boolean; bounty: number }): number {
  if (params.alreadySolved) return 0;
  return Math.max(0, Math.trunc(params.bounty));
}

/** Status soal per siswa diturunkan dari solve record dan histori attempt. */
export function deriveQuestionStatus(input: {
  solved: boolean;
  attemptStatuses: readonly AttemptStatus[];
}): QuestionProgressStatus {
  if (input.solved) return "SOLVED";
  if (input.attemptStatuses.includes("PENDING_REVIEW")) return "PENDING_REVIEW";
  if (input.attemptStatuses.length > 0) return "ATTEMPTED";
  return "UNSOLVED";
}

/** Progress paket = jumlah soal unik dalam paket yang sudah SOLVED. */
export function packageProgress(questionIds: readonly string[], solvedIds: ReadonlySet<string>) {
  const unique = Array.from(new Set(questionIds));
  const solved = unique.filter((id) => solvedIds.has(id)).length;
  const total = unique.length;
  return { solved, total, percent: total === 0 ? 0 : Math.round((solved / total) * 100) };
}

/** Normalisasi untuk membandingkan jawaban isian dengan jawaban acuan (bantuan reviewer saja). */
export function normalizeAnswer(text: string): string {
  return text.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}
