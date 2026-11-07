import { randomInt } from "node:crypto";
import type { PullType } from "@prisma/client";

export const TEN_PULL_COUNT = 10;
export const TEN_PULL_PRICE_MULTIPLIER = 9;
export const STEP_UP_STAGES = 5;
export const GUARANTEE_RARITY = 6;

/** rng(maxExclusive) → integer [0, maxExclusive). Default: CSPRNG Node.js. */
export type Rng = (maxExclusive: number) => number;
export const secureRng: Rng = (max) => randomInt(0, max);

export type PoolEntry = {
  characterId: string;
  rarity: number;
  weight: number;
  isFeatured: boolean;
};

export type RolledResult = PoolEntry & { isGuaranteed: boolean };

export function tenPullPrice(singlePrice: number): number {
  return singlePrice * TEN_PULL_PRICE_MULTIPLIER;
}

export type StepStage = { stage: number; price: number; pullCount: number };

export function pullCost(
  pullType: PullType,
  banner: { singlePrice: number },
  stage?: StepStage,
): { price: number; count: number } {
  switch (pullType) {
    case "SINGLE":
      return { price: banner.singlePrice, count: 1 };
    case "TEN_PULL":
      return { price: tenPullPrice(banner.singlePrice), count: TEN_PULL_COUNT };
    case "STEP_UP":
      if (!stage) throw new Error("Tahap step-up tidak ditemukan");
      return { price: stage.price, count: stage.pullCount };
  }
}

/** Tahap berikutnya; setelah tahap 5 kembali ke 1 (siklus selesai). */
export function nextStepStage(current: number): { next: number; cycleCompleted: boolean } {
  if (!Number.isInteger(current) || current < 1 || current > STEP_UP_STAGES) {
    throw new Error("Tahap step-up tidak valid");
  }
  if (current === STEP_UP_STAGES) return { next: 1, cycleCompleted: true };
  return { next: current + 1, cycleCompleted: false };
}

export function totalWeight(pool: readonly PoolEntry[]): number {
  return pool.reduce((sum, e) => sum + e.weight, 0);
}

/** Pilih satu entry berdasarkan weight memakai rng (default crypto.randomInt). */
export function rollWeighted<T extends { weight: number }>(
  pool: readonly T[],
  rng: Rng = secureRng,
): T {
  const total = pool.reduce((sum, e) => sum + e.weight, 0);
  if (pool.length === 0 || total <= 0) throw new Error("Pool gacha kosong");
  let ticket = rng(total);
  if (!Number.isInteger(ticket) || ticket < 0 || ticket >= total)
    throw new Error("RNG di luar rentang");
  for (const entry of pool) {
    if (ticket < entry.weight) return entry;
    ticket -= entry.weight;
  }
  throw new Error("Roll gagal"); // tidak terjangkau
}

export function rollMany(
  pool: readonly PoolEntry[],
  count: number,
  rng: Rng = secureRng,
): RolledResult[] {
  return Array.from({ length: count }, () => ({ ...rollWeighted(pool, rng), isGuaranteed: false }));
}

/**
 * Jaminan minimal satu 6★. Jika hasil sudah memuat 6★ (dan featured bila diwajibkan), tidak diubah.
 * Jika tidak, hasil terakhir diganti roll berbobot dari pool 6★ (atau featured 6★).
 */
export function applySixStarGuarantee(
  results: readonly RolledResult[],
  pool: readonly PoolEntry[],
  options: { requireFeatured: boolean },
  rng: Rng = secureRng,
): RolledResult[] {
  const qualifies = (e: PoolEntry) =>
    e.rarity >= GUARANTEE_RARITY && (!options.requireFeatured || e.isFeatured);
  if (results.length === 0) throw new Error("Tidak ada hasil untuk dijamin");
  if (results.some(qualifies)) return [...results];
  const guaranteePool = pool.filter(qualifies);
  if (guaranteePool.length === 0)
    throw new Error("Banner tidak memiliki karakter 6★ untuk jaminan");
  const replacement: RolledResult = { ...rollWeighted(guaranteePool, rng), isGuaranteed: true };
  return [...results.slice(0, -1), replacement];
}

/** Peluang per karakter dan agregat per rarity (untuk rate disclosure). */
export function computeRates(pool: readonly PoolEntry[]) {
  const total = totalWeight(pool);
  const perCharacter = pool.map((e) => ({
    characterId: e.characterId,
    rarity: e.rarity,
    isFeatured: e.isFeatured,
    rate: total === 0 ? 0 : e.weight / total,
  }));
  const perRarity = [6, 5, 4, 3, 2, 1]
    .map((rarity) => ({
      rarity,
      rate: perCharacter.filter((c) => c.rarity === rarity).reduce((s, c) => s + c.rate, 0),
    }))
    .filter((r) => r.rate > 0);
  return { total, perCharacter, perRarity };
}

export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(rate < 0.01 ? 3 : 2)}%`;
}
