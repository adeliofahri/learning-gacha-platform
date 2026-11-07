import { describe, expect, it } from "vitest";
import {
  applySixStarGuarantee,
  computeRates,
  nextStepStage,
  pullCost,
  rollMany,
  rollWeighted,
  tenPullPrice,
  type PoolEntry,
  type Rng,
} from "@/server/domain/gacha";
import { resolveAcquisition, shardsForDuplicate } from "@/server/domain/shards";

const shardConfig = { 1: 1, 2: 2, 3: 5, 4: 10, 5: 25, 6: 50 };

const pool: PoolEntry[] = [
  { characterId: "c1", rarity: 1, weight: 70, isFeatured: false },
  { characterId: "c3", rarity: 3, weight: 25, isFeatured: false },
  { characterId: "c6a", rarity: 6, weight: 3, isFeatured: false },
  { characterId: "c6f", rarity: 6, weight: 2, isFeatured: true },
];

/** RNG deterministik untuk test. */
const fixed =
  (value: number): Rng =>
  () =>
    value;
const sequence = (values: number[]): Rng => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

describe("harga pull", () => {
  it("single = harga single, ten-pull = 9× single dengan 10 hasil", () => {
    expect(pullCost("SINGLE", { singlePrice: 100 })).toEqual({ price: 100, count: 1 });
    expect(pullCost("TEN_PULL", { singlePrice: 100 })).toEqual({ price: 900, count: 10 });
    expect(tenPullPrice(150)).toBe(1350);
  });
  it("step-up memakai harga tahap yang berjalan", () => {
    expect(
      pullCost("STEP_UP", { singlePrice: 100 }, { stage: 3, price: 200, pullCount: 1 }),
    ).toEqual({ price: 200, count: 1 });
    expect(() => pullCost("STEP_UP", { singlePrice: 100 })).toThrow();
  });
});

describe("step-up progression", () => {
  it("berjalan berurutan 1→5 lalu reset ke 1", () => {
    expect(nextStepStage(1)).toEqual({ next: 2, cycleCompleted: false });
    expect(nextStepStage(4)).toEqual({ next: 5, cycleCompleted: false });
    expect(nextStepStage(5)).toEqual({ next: 1, cycleCompleted: true });
  });
  it("menolak tahap di luar 1-5", () => {
    expect(() => nextStepStage(0)).toThrow();
    expect(() => nextStepStage(6)).toThrow();
  });
});

describe("roll berbobot", () => {
  it("memetakan tiket ke entry sesuai weight", () => {
    expect(rollWeighted(pool, fixed(0)).characterId).toBe("c1");
    expect(rollWeighted(pool, fixed(69)).characterId).toBe("c1");
    expect(rollWeighted(pool, fixed(70)).characterId).toBe("c3");
    expect(rollWeighted(pool, fixed(95)).characterId).toBe("c6a");
    expect(rollWeighted(pool, fixed(99)).characterId).toBe("c6f");
  });
  it("menolak RNG di luar rentang dan pool kosong", () => {
    expect(() => rollWeighted(pool, fixed(100))).toThrow();
    expect(() => rollWeighted([], fixed(0))).toThrow();
  });
  it("rollMany menghasilkan tepat N hasil", () => {
    expect(rollMany(pool, 10, fixed(0))).toHaveLength(10);
  });
  it("distribusi CSPRNG mendekati rate (sanity)", () => {
    const n = 20_000;
    const results = rollMany(pool, n);
    const ones = results.filter((r) => r.characterId === "c1").length / n;
    expect(ones).toBeGreaterThan(0.66);
    expect(ones).toBeLessThan(0.74);
  });
});

describe("jaminan 6★", () => {
  const noSix = rollMany(pool, 3, fixed(0)); // semua 1★
  it("mengganti hasil terakhir dengan 6★ bila tidak ada 6★", () => {
    const out = applySixStarGuarantee(noSix, pool, { requireFeatured: false }, fixed(0));
    expect(out).toHaveLength(3);
    expect(out.filter((r) => r.rarity === 6)).toHaveLength(1);
    expect(out[2]!.isGuaranteed).toBe(true);
  });
  it("tidak mengubah hasil yang sudah memuat 6★", () => {
    const withSix = rollMany(pool, 2, sequence([0, 96]));
    const out = applySixStarGuarantee(withSix, pool, { requireFeatured: false }, fixed(0));
    expect(out).toEqual(withSix);
  });
  it("jaminan 6★ tidak otomatis featured", () => {
    // fixed(0) dari pool 6★ (c6a weight 3, c6f weight 2) → c6a (non-featured)
    const out = applySixStarGuarantee(noSix, pool, { requireFeatured: false }, fixed(0));
    expect(out[2]!.characterId).toBe("c6a");
    expect(out[2]!.isFeatured).toBe(false);
  });
  it("aturan guarantee featured terpisah menjamin 6★ featured", () => {
    const nonFeaturedSix = rollMany(pool, 1, fixed(96)); // c6a
    const out = applySixStarGuarantee(nonFeaturedSix, pool, { requireFeatured: true }, fixed(0));
    expect(out[0]!.characterId).toBe("c6f");
  });
  it("error bila banner tidak punya 6★", () => {
    expect(() =>
      applySixStarGuarantee(noSix, pool.slice(0, 2), { requireFeatured: false }, fixed(0)),
    ).toThrow();
  });
});

describe("rate disclosure", () => {
  it("menghitung rate per karakter dan per rarity", () => {
    const rates = computeRates(pool);
    expect(rates.total).toBe(100);
    expect(rates.perRarity).toEqual([
      { rarity: 6, rate: 0.05 },
      { rarity: 3, rate: 0.25 },
      { rarity: 1, rate: 0.7 },
    ]);
  });
});

describe("konversi duplikat ke shard", () => {
  it("sesuai konfigurasi rarity", () => {
    expect([1, 2, 3, 4, 5, 6].map((r) => shardsForDuplicate(r, shardConfig))).toEqual([
      1, 2, 5, 10, 25, 50,
    ]);
  });
  it("karakter baru tidak dikonversi", () => {
    expect(resolveAcquisition({ alreadyOwned: false, rarity: 6, config: shardConfig })).toEqual({
      isNew: true,
      shards: 0,
    });
    expect(resolveAcquisition({ alreadyOwned: true, rarity: 6, config: shardConfig })).toEqual({
      isNew: false,
      shards: 50,
    });
  });
  it("menolak rarity tidak valid", () => {
    expect(() => shardsForDuplicate(7, shardConfig)).toThrow();
  });
});
