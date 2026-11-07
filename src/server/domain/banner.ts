import type { BannerStatus, BannerType } from "@prisma/client";
import { GUARANTEE_RARITY, STEP_UP_STAGES } from "./gacha";

export type BannerAvailability = "DRAFT" | "UPCOMING" | "ACTIVE" | "ENDED" | "ARCHIVED";

export const AVAILABILITY_LABEL: Record<BannerAvailability, string> = {
  DRAFT: "Draft",
  UPCOMING: "Segera hadir",
  ACTIVE: "Aktif",
  ENDED: "Berakhir",
  ARCHIVED: "Diarsipkan",
};

export function bannerAvailability(
  banner: { status: BannerStatus; type: BannerType; startsAt: Date | null; endsAt: Date | null },
  now: Date = new Date(),
): BannerAvailability {
  if (banner.status === "ARCHIVED") return "ARCHIVED";
  if (banner.status === "DRAFT") return "DRAFT";
  if (banner.startsAt && now < banner.startsAt) return "UPCOMING";
  if (banner.type === "LIMITED" && banner.endsAt && now >= banner.endsAt) return "ENDED";
  return "ACTIVE";
}

export function isBannerPullable(...args: Parameters<typeof bannerAvailability>): boolean {
  return bannerAvailability(...args) === "ACTIVE";
}

export type BannerValidationInput = {
  type: BannerType;
  startsAt: Date | null;
  endsAt: Date | null;
  singlePrice: number;
  stepUpEnabled: boolean;
  stepUpGuaranteeFeatured: boolean;
  entries: { rarity: number; weight: number; isFeatured: boolean; characterActive: boolean }[];
  stages: { stage: number; price: number; pullCount: number }[];
};

/** Validasi konfigurasi banner sebelum dipublikasikan. Mengembalikan daftar error (kosong = valid). */
export function validateBannerForPublish(b: BannerValidationInput): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(b.singlePrice) || b.singlePrice <= 0) errors.push("Harga single harus > 0");
  if (b.entries.length === 0) errors.push("Banner harus memiliki minimal satu karakter");
  if (b.entries.some((e) => !Number.isInteger(e.weight) || e.weight <= 0)) {
    errors.push("Semua weight harus bilangan bulat > 0");
  }
  if (b.entries.some((e) => !e.characterActive)) {
    errors.push("Karakter yang diarsipkan tidak boleh ada di banner yang dipublikasikan");
  }
  if (b.type === "LIMITED") {
    if (!b.startsAt || !b.endsAt) errors.push("Banner limited wajib memiliki tanggal mulai dan akhir");
    else if (b.startsAt >= b.endsAt) errors.push("Tanggal akhir harus setelah tanggal mulai");
  } else if (b.endsAt) {
    errors.push("Banner permanent tidak boleh memiliki tanggal akhir");
  }
  if (b.stepUpEnabled) {
    if (b.type !== "LIMITED") errors.push("Step-up hanya untuk banner limited");
    const stages = [...b.stages].sort((x, y) => x.stage - y.stage);
    const expected = Array.from({ length: STEP_UP_STAGES }, (_, i) => i + 1);
    if (stages.length !== STEP_UP_STAGES || stages.some((s, i) => s.stage !== expected[i])) {
      errors.push("Step-up wajib memiliki tepat 5 tahap berurutan (1-5)");
    }
    if (stages.some((s) => s.price <= 0)) errors.push("Harga setiap tahap step-up harus > 0");
    if (stages.some((s) => s.pullCount < 1 || s.pullCount > 10)) {
      errors.push("Jumlah pull per tahap harus 1-10");
    }
    const sixStars = b.entries.filter((e) => e.rarity >= GUARANTEE_RARITY);
    if (sixStars.length === 0) errors.push("Step-up membutuhkan minimal satu karakter 6★ untuk jaminan");
    if (b.stepUpGuaranteeFeatured && !sixStars.some((e) => e.isFeatured)) {
      errors.push("Jaminan featured membutuhkan minimal satu karakter 6★ featured");
    }
  }
  return errors;
}
