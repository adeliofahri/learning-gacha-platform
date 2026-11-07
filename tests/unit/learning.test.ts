import { describe, expect, it } from "vitest";
import {
  bountyForCorrectAnswer,
  defaultBounty,
  deriveQuestionStatus,
  normalizeAnswer,
  packageProgress,
} from "@/server/domain/learning";

const config = { EASY: 5, MEDIUM: 10, HARD: 20, EXPERT: 35 };

describe("perhitungan bounty", () => {
  it("memakai konfigurasi difficulty sebagai bounty default", () => {
    expect(defaultBounty("EASY", config)).toBe(5);
    expect(defaultBounty("MEDIUM", config)).toBe(10);
    expect(defaultBounty("HARD", config)).toBe(20);
    expect(defaultBounty("EXPERT", config)).toBe(35);
  });
  it("mengikuti konfigurasi yang diubah admin", () => {
    expect(defaultBounty("HARD", { ...config, HARD: 50 })).toBe(50);
  });
  it("menolak konfigurasi tidak valid", () => {
    expect(() => defaultBounty("EASY", { ...config, EASY: -1 })).toThrow();
  });
  it("memberi bounty hanya jika belum solved", () => {
    expect(bountyForCorrectAnswer({ alreadySolved: false, bounty: 20 })).toBe(20);
    expect(bountyForCorrectAnswer({ alreadySolved: true, bounty: 20 })).toBe(0);
  });
});

describe("status soal", () => {
  it("UNSOLVED bila belum ada attempt", () => {
    expect(deriveQuestionStatus({ solved: false, attemptStatuses: [] })).toBe("UNSOLVED");
  });
  it("ATTEMPTED bila pernah salah", () => {
    expect(
      deriveQuestionStatus({ solved: false, attemptStatuses: ["INCORRECT", "REJECTED"] }),
    ).toBe("ATTEMPTED");
  });
  it("PENDING_REVIEW bila ada jawaban menunggu", () => {
    expect(
      deriveQuestionStatus({ solved: false, attemptStatuses: ["REJECTED", "PENDING_REVIEW"] }),
    ).toBe("PENDING_REVIEW");
  });
  it("SOLVED mengalahkan status lain", () => {
    expect(
      deriveQuestionStatus({ solved: true, attemptStatuses: ["INCORRECT", "PENDING_REVIEW"] }),
    ).toBe("SOLVED");
  });
});

describe("progress paket", () => {
  it("dihitung dari soal unik yang solved", () => {
    expect(packageProgress(["a", "b", "c", "d"], new Set(["a", "c", "x"]))).toEqual({
      solved: 2,
      total: 4,
      percent: 50,
    });
  });
  it("paket kosong = 0%", () => {
    expect(packageProgress([], new Set())).toEqual({ solved: 0, total: 0, percent: 0 });
  });
});

it("normalisasi jawaban isian", () => {
  expect(normalizeAnswer("  Jantung  ")).toBe("jantung");
  expect(normalizeAnswer("2,   3")).toBe("2, 3");
});
