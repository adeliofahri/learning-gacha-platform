import { prisma, transaction } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import type { BannerInput } from "@/lib/validation/collection";
import { validateBannerForPublish } from "@/server/domain/banner";
import { logAudit } from "./audit.service";
import type { Tx } from "@/lib/db";

async function validationInput(tx: Tx, input: BannerInput) {
  const chars = await tx.character.findMany({
    where: { id: { in: input.entries.map((e) => e.characterId) } },
  });
  if (chars.length !== input.entries.length)
    throw new AppError("BAD_REQUEST", "Ada karakter yang tidak ditemukan");
  const byId = new Map(chars.map((c) => [c.id, c]));
  return {
    type: input.type,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    singlePrice: input.singlePrice,
    stepUpEnabled: input.stepUpEnabled,
    stepUpGuaranteeFeatured: input.stepUpGuaranteeFeatured,
    entries: input.entries.map((e) => ({
      rarity: byId.get(e.characterId)!.rarity,
      weight: e.weight,
      isFeatured: e.isFeatured,
      characterActive: byId.get(e.characterId)!.status === "ACTIVE",
    })),
    stages: input.stages,
  };
}

function bannerData(input: BannerInput) {
  return {
    name: input.name,
    description: input.description,
    type: input.type,
    startsAt: input.startsAt ?? null,
    endsAt: input.type === "PERMANENT" ? null : (input.endsAt ?? null),
    singlePrice: input.singlePrice,
    stepUpEnabled: input.type === "LIMITED" && input.stepUpEnabled,
    stepUpGuaranteeFeatured: input.stepUpGuaranteeFeatured,
    isDemoRate: input.isDemoRate,
    imageUrl: input.imageUrl ?? null,
  };
}

async function writeChildren(tx: Tx, bannerId: string, input: BannerInput) {
  await tx.bannerCharacter.deleteMany({ where: { bannerId } });
  await tx.stepUpStage.deleteMany({ where: { bannerId } });
  if (input.entries.length) {
    await tx.bannerCharacter.createMany({ data: input.entries.map((e) => ({ ...e, bannerId })) });
  }
  if (input.type === "LIMITED" && input.stepUpEnabled && input.stages.length) {
    await tx.stepUpStage.createMany({ data: input.stages.map((s) => ({ ...s, bannerId })) });
  }
}

/** Banner baru selalu DRAFT; publikasi lewat publishBanner setelah validasi. */
export async function createBanner(adminId: string, input: BannerInput) {
  return transaction(async (tx) => {
    await validationInput(tx, input); // memastikan karakter ada
    const banner = await tx.banner.create({ data: { ...bannerData(input), status: "DRAFT" } });
    await writeChildren(tx, banner.id, input);
    await logAudit(tx, {
      actorId: adminId,
      action: "BANNER_CREATE",
      targetType: "Banner",
      targetId: banner.id,
      metadata: { name: banner.name },
    });
    return banner;
  });
}

export async function updateBanner(adminId: string, id: string, input: BannerInput) {
  return transaction(async (tx) => {
    const existing = await tx.banner.findUnique({ where: { id } });
    if (!existing) throw notFound("Banner");
    if (existing.status === "ARCHIVED")
      throw new AppError("CONFLICT", "Banner yang diarsipkan tidak dapat diubah");
    const v = await validationInput(tx, input);
    if (existing.status === "ACTIVE") {
      const errors = validateBannerForPublish(v);
      if (errors.length)
        throw new AppError("UNPROCESSABLE", "Konfigurasi banner aktif tidak valid", errors);
    }
    const banner = await tx.banner.update({ where: { id }, data: bannerData(input) });
    await writeChildren(tx, id, input);
    await logAudit(tx, {
      actorId: adminId,
      action: "BANNER_UPDATE",
      targetType: "Banner",
      targetId: id,
      metadata: {
        entries: input.entries.length,
        singlePrice: input.singlePrice,
        stepUp: input.stepUpEnabled,
      },
    });
    return banner;
  });
}

export async function getBannerAdmin(id: string) {
  const banner = await prisma.banner.findUnique({
    where: { id },
    include: {
      entries: { include: { character: true }, orderBy: { character: { rarity: "desc" } } },
      stepUpStages: { orderBy: { stage: "asc" } },
      _count: { select: { pulls: true } },
    },
  });
  if (!banner) throw notFound("Banner");
  return banner;
}

export async function publishBanner(adminId: string, id: string) {
  return transaction(async (tx) => {
    const b = await tx.banner.findUnique({
      where: { id },
      include: { entries: { include: { character: true } }, stepUpStages: true },
    });
    if (!b) throw notFound("Banner");
    if (b.status === "ARCHIVED") throw new AppError("CONFLICT", "Banner diarsipkan");
    const errors = validateBannerForPublish({
      type: b.type,
      startsAt: b.startsAt,
      endsAt: b.endsAt,
      singlePrice: b.singlePrice,
      stepUpEnabled: b.stepUpEnabled,
      stepUpGuaranteeFeatured: b.stepUpGuaranteeFeatured,
      entries: b.entries.map((e) => ({
        rarity: e.character.rarity,
        weight: e.weight,
        isFeatured: e.isFeatured,
        characterActive: e.character.status === "ACTIVE",
      })),
      stages: b.stepUpStages,
    });
    if (errors.length)
      throw new AppError("UNPROCESSABLE", "Banner belum valid untuk dipublikasikan", errors);
    const banner = await tx.banner.update({ where: { id }, data: { status: "ACTIVE" } });
    await logAudit(tx, {
      actorId: adminId,
      action: "BANNER_PUBLISH",
      targetType: "Banner",
      targetId: id,
      metadata: { isDemoRate: b.isDemoRate },
    });
    return banner;
  });
}

/** Arsip = tidak dapat dipakai pull baru; histori tetap tersimpan (tidak ada delete). */
export async function archiveBanner(adminId: string, id: string) {
  return transaction(async (tx) => {
    const banner = await tx.banner
      .update({ where: { id }, data: { status: "ARCHIVED" } })
      .catch(() => {
        throw notFound("Banner");
      });
    await logAudit(tx, {
      actorId: adminId,
      action: "BANNER_ARCHIVE",
      targetType: "Banner",
      targetId: id,
    });
    return banner;
  });
}
