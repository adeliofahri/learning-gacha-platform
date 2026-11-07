import { describe, expect, it } from "vitest";
import { bannerAvailability, validateBannerForPublish, type BannerValidationInput } from "@/server/domain/banner";
import {
  compareLeaderboard,
  lifetimeStars,
  monthlyStars,
  monthRange,
  rankRows,
  type OwnedCharacter,
} from "@/server/domain/leaderboard";

const now = new Date("2026-11-07T05:00:00Z");
const day = 86_400_000;

describe("validasi banner aktif", () => {
  const base = { status: "ACTIVE" as const, type: "LIMITED" as const };
  it("ACTIVE dalam rentang waktu", () => {
    expect(bannerAvailability({ ...base, startsAt: new Date(+now - day), endsAt: new Date(+now + day) }, now)).toBe("ACTIVE");
  });
  it("ENDED setelah endsAt", () => {
    expect(bannerAvailability({ ...base, startsAt: new Date(+now - 2 * day), endsAt: new Date(+now - 1) }, now)).toBe("ENDED");
  });
  it("UPCOMING sebelum startsAt", () => {
    expect(bannerAvailability({ ...base, startsAt: new Date(+now + day), endsAt: new Date(+now + 2 * day) }, now)).toBe("UPCOMING");
  });
  it("DRAFT / ARCHIVED tidak aktif", () => {
    expect(bannerAvailability({ ...base, status: "DRAFT", startsAt: null, endsAt: null }, now)).toBe("DRAFT");
    expect(bannerAvailability({ ...base, status: "ARCHIVED", startsAt: null, endsAt: null }, now)).toBe("ARCHIVED");
  });
  it("PERMANENT tanpa tanggal akhir selalu aktif", () => {
    expect(bannerAvailability({ status: "ACTIVE", type: "PERMANENT", startsAt: null, endsAt: null }, now)).toBe("ACTIVE");
  });
});

describe("validasi publish banner", () => {
  const valid: BannerValidationInput = {
    type: "LIMITED",
    startsAt: new Date(+now - day),
    endsAt: new Date(+now + day),
    singlePrice: 100,
    stepUpEnabled: true,
    stepUpGuaranteeFeatured: false,
    entries: [
      { rarity: 6, weight: 2, isFeatured: true, characterActive: true },
      { rarity: 1, weight: 98, isFeatured: false, characterActive: true },
    ],
    stages: [1, 2, 3, 4, 5].map((stage) => ({ stage, price: 100 + (stage - 1) * 50, pullCount: 1 })),
  };
  it("konfigurasi valid lolos", () => expect(validateBannerForPublish(valid)).toEqual([]));
  it("step-up wajib 5 tahap", () => {
    expect(validateBannerForPublish({ ...valid, stages: valid.stages.slice(0, 4) })).toContain(
      "Step-up wajib memiliki tepat 5 tahap berurutan (1-5)",
    );
  });
  it("step-up butuh karakter 6★", () => {
    const errors = validateBannerForPublish({ ...valid, entries: [valid.entries[1]!] });
    expect(errors.some((e) => e.includes("6★"))).toBe(true);
  });
  it("step-up tidak boleh di banner permanent", () => {
    expect(validateBannerForPublish({ ...valid, type: "PERMANENT", endsAt: null })).toContain("Step-up hanya untuk banner limited");
  });
  it("limited wajib rentang tanggal yang valid", () => {
    expect(validateBannerForPublish({ ...valid, endsAt: valid.startsAt }).length).toBeGreaterThan(0);
  });
  it("banner kosong ditolak", () => {
    expect(validateBannerForPublish({ ...valid, stepUpEnabled: false, entries: [] })).toContain(
      "Banner harus memiliki minimal satu karakter",
    );
  });
});

describe("leaderboard", () => {
  const items: OwnedCharacter[] = [
    { characterId: "a", rarity: 6, quantity: 1, firstObtainedAt: new Date("2026-10-31T16:59:59Z") }, // 31 Okt 23:59 WIB
    { characterId: "b", rarity: 3, quantity: 1, firstObtainedAt: new Date("2026-10-31T17:00:00Z") }, // 1 Nov 00:00 WIB
    { characterId: "c", rarity: 5, quantity: 1, firstObtainedAt: new Date("2026-11-20T00:00:00Z") },
    { characterId: "d", rarity: 4, quantity: 0, firstObtainedAt: new Date("2026-11-20T00:00:00Z") },
  ];

  it("lifetime star = SUM rarity karakter unik dengan quantity > 0", () => {
    expect(lifetimeStars(items)).toBe(14);
  });
  it("duplikat tidak menambah skor", () => {
    expect(lifetimeStars([...items, { ...items[0]! }])).toBe(14);
  });
  it("monthly star memakai batas bulan Asia/Jakarta", () => {
    const nov = monthRange({ year: 2026, month: 11 }, "Asia/Jakarta");
    expect(nov.start.toISOString()).toBe("2026-10-31T17:00:00.000Z");
    expect(nov.end.toISOString()).toBe("2026-11-30T17:00:00.000Z");
    expect(monthlyStars(items, nov)).toBe(8);
    expect(monthlyStars(items, monthRange({ year: 2026, month: 10 }, "Asia/Jakarta"))).toBe(6);
  });
  it("monthRange Desember berpindah tahun", () => {
    const dec = monthRange({ year: 2026, month: 12 }, "UTC");
    expect(dec.end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
  it("tie-break: skor → soal solved → waktu tercapai → username", () => {
    const rows = [
      { userId: "1", username: "zeta", score: 10, solvedCount: 2, reachedAt: new Date(2) },
      { userId: "2", username: "alpha", score: 10, solvedCount: 5, reachedAt: new Date(9) },
      { userId: "3", username: "beta", score: 10, solvedCount: 2, reachedAt: new Date(1) },
      { userId: "4", username: "omega", score: 12, solvedCount: 0, reachedAt: new Date(50) },
    ];
    expect(rankRows(rows).map((r) => r.username)).toEqual(["omega", "alpha", "beta", "zeta"]);
    expect(compareLeaderboard(rows[0]!, { ...rows[0]!, username: "aaa" })).toBeGreaterThan(0);
  });
});
