import { randomUUID } from "node:crypto";
import type { Prisma, PullType } from "@prisma/client";
import { prisma, transaction, isUniqueViolation, type Tx } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import {
  applySixStarGuarantee,
  computeRates,
  nextStepStage,
  pullCost,
  rollMany,
  secureRng,
  STEP_UP_STAGES,
  tenPullPrice,
  type PoolEntry,
  type Rng,
} from "@/server/domain/gacha";
import { bannerAvailability } from "@/server/domain/banner";
import { shardsForDuplicate, type ShardConfig } from "@/server/domain/shards";
import { applyWalletChange } from "./wallet.service";

export async function getShardConfig(db: Tx | typeof prisma = prisma): Promise<ShardConfig> {
  const rows = await db.duplicateShardConfig.findMany();
  const config: ShardConfig = { 1: 1, 2: 2, 3: 5, 4: 10, 5: 25, 6: 50 };
  for (const r of rows) config[r.rarity] = r.shards;
  return config;
}

const bannerInclude = {
  entries: { include: { character: true }, orderBy: [{ character: { rarity: "desc" } }, { weight: "desc" }] },
  stepUpStages: { orderBy: { stage: "asc" } },
} satisfies Prisma.BannerInclude;

/** Banner yang terlihat siswa: ACTIVE (termasuk yang sudah berakhir agar histori/status terlihat). */
export async function listBannersForStudent(now = new Date()) {
  const banners = await prisma.banner.findMany({
    where: { status: "ACTIVE" },
    include: bannerInclude,
    orderBy: [{ type: "desc" }, { createdAt: "desc" }],
  });
  return banners.map((b) => ({ ...b, availability: bannerAvailability(b, now), tenPullPrice: tenPullPrice(b.singlePrice) }));
}

export async function getBannerDetail(bannerId: string, userId?: string, now = new Date()) {
  const banner = await prisma.banner.findFirst({ where: { id: bannerId, status: { not: "DRAFT" } }, include: bannerInclude });
  if (!banner) throw notFound("Banner");
  const pool = poolFromEntries(banner.entries);
  const rates = computeRates(pool);
  const progress =
    userId && banner.stepUpEnabled
      ? await prisma.stepUpProgress.findUnique({ where: { userId_bannerId: { userId, bannerId } } })
      : null;
  return {
    ...banner,
    availability: bannerAvailability(banner, now),
    tenPullPrice: tenPullPrice(banner.singlePrice),
    rates,
    stepUp: banner.stepUpEnabled
      ? { currentStage: progress?.currentStage ?? 1, cyclesCompleted: progress?.cyclesCompleted ?? 0 }
      : null,
  };
}

function poolFromEntries(
  entries: { characterId: string; weight: number; isFeatured: boolean; character: { rarity: number; status: string } }[],
): PoolEntry[] {
  return entries
    .filter((e) => e.character.status === "ACTIVE")
    .map((e) => ({ characterId: e.characterId, rarity: e.character.rarity, weight: e.weight, isFeatured: e.isFeatured }));
}

export type PullOutcome = Awaited<ReturnType<typeof loadPull>> & { replayed: boolean; coins: number; shards: number };

async function loadPull(pullId: string) {
  return prisma.gachaPull.findUniqueOrThrow({
    where: { id: pullId },
    include: {
      banner: { select: { id: true, name: true } },
      results: {
        orderBy: { position: "asc" },
        include: { character: { select: { id: true, name: true, rarity: true, imageUrl: true } } },
      },
    },
  });
}

async function outcome(pullId: string, userId: string, replayed: boolean): Promise<PullOutcome> {
  const [pull, wallet] = await Promise.all([loadPull(pullId), prisma.wallet.findUnique({ where: { userId } })]);
  return { ...pull, replayed, coins: wallet?.coins ?? 0, shards: wallet?.shards ?? 0 };
}

/**
 * Melakukan pull gacha. Seluruh langkah dalam satu transaksi DB:
 * idempotency → validasi banner → step-up lock → debit koin → roll (CSPRNG) → inventory/shard → history.
 */
export async function performPull(params: {
  userId: string;
  bannerId: string;
  pullType: PullType;
  idempotencyKey: string;
  rng?: Rng;
  now?: Date;
}): Promise<PullOutcome> {
  const { userId, bannerId, pullType, idempotencyKey } = params;
  const rng = params.rng ?? secureRng;

  const existing = await prisma.gachaPull.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey } } });
  if (existing) {
    if (existing.bannerId !== bannerId || existing.pullType !== pullType) {
      throw new AppError("CONFLICT", "Idempotency-Key sudah dipakai untuk request lain");
    }
    return outcome(existing.id, userId, true);
  }

  try {
    const pullId = await transaction(async (tx) => {
      const now = params.now ?? new Date();
      const banner = await tx.banner.findUnique({ where: { id: bannerId }, include: bannerInclude });
      if (!banner) throw notFound("Banner");
      const availability = bannerAvailability(banner, now);
      if (availability !== "ACTIVE") {
        throw new AppError(
          "CONFLICT",
          availability === "ENDED" ? "Banner sudah berakhir. Pull baru tidak tersedia." : "Banner tidak aktif",
        );
      }
      const pool = poolFromEntries(banner.entries);
      if (pool.length === 0) throw new AppError("CONFLICT", "Banner tidak memiliki karakter aktif");

      // ── Step-up: kunci tahap memakai optimistic update ──
      let stepNumber: number | null = null;
      let stage: { stage: number; price: number; pullCount: number } | undefined;
      if (pullType === "STEP_UP") {
        if (!banner.stepUpEnabled || banner.type !== "LIMITED") {
          throw new AppError("BAD_REQUEST", "Banner ini tidak mendukung step-up");
        }
        await tx.$executeRaw`
          INSERT INTO "StepUpProgress" ("userId", "bannerId", "currentStage", "cyclesCompleted", "updatedAt")
          VALUES (${userId}, ${bannerId}, 1, 0, NOW()) ON CONFLICT DO NOTHING`;
        const progress = await tx.stepUpProgress.findUniqueOrThrow({ where: { userId_bannerId: { userId, bannerId } } });
        stepNumber = progress.currentStage;
        stage = banner.stepUpStages.find((s) => s.stage === stepNumber);
        if (!stage || banner.stepUpStages.length !== STEP_UP_STAGES) {
          throw new AppError("CONFLICT", "Konfigurasi step-up banner tidak lengkap");
        }
        const { next, cycleCompleted } = nextStepStage(stepNumber);
        const moved = await tx.stepUpProgress.updateMany({
          where: { userId, bannerId, currentStage: stepNumber },
          data: { currentStage: next, cyclesCompleted: cycleCompleted ? { increment: 1 } : undefined },
        });
        if (moved.count === 0) throw new AppError("CONFLICT", "Pull step-up lain sedang diproses. Coba lagi.");
      }

      const { price, count } = pullCost(pullType, banner, stage);

      const pull = await tx.gachaPull.create({
        data: { userId, bannerId, pullType, price, stepNumber, idempotencyKey },
      });

      await applyWalletChange(tx, {
        userId,
        currency: "COIN",
        amount: -price,
        type: "GACHA_SPEND",
        referenceType: "GachaPull",
        referenceId: pull.id,
        description: `${banner.name} — ${pullType}${stepNumber ? ` tahap ${stepNumber}` : ""}`,
        metadata: { pullType, count, stepNumber },
      });

      let results = rollMany(pool, count, rng);
      if (pullType === "STEP_UP" && stepNumber === STEP_UP_STAGES) {
        results = applySixStarGuarantee(results, pool, { requireFeatured: banner.stepUpGuaranteeFeatured }, rng);
      }

      const shardConfig = await getShardConfig(tx);
      const rows: {
        id: string;
        pullId: string;
        characterId: string;
        rarity: number;
        position: number;
        isNew: boolean;
        isGuaranteed: boolean;
        isFeatured: boolean;
        shardsAwarded: number;
      }[] = [];

      for (const [position, r] of results.entries()) {
        const dupeShards = shardsForDuplicate(r.rarity, shardConfig);
        // Upsert atomik: xmax = 0 menandakan baris baru (karakter belum dimiliki).
        const upserted = await tx.$queryRaw<{ inserted: boolean }[]>`
          INSERT INTO "InventoryItem" ("id", "userId", "characterId", "quantity", "duplicateCount",
                                       "shardsFromDuplicates", "firstObtainedAt", "lastObtainedAt")
          VALUES (${randomUUID()}, ${userId}, ${r.characterId}, 1, 0, 0, NOW(), NOW())
          ON CONFLICT ("userId", "characterId") DO UPDATE SET
            "lastObtainedAt" = NOW(),
            "quantity" = GREATEST("InventoryItem"."quantity", 1),
            "duplicateCount" = "InventoryItem"."duplicateCount" + 1,
            "shardsFromDuplicates" = "InventoryItem"."shardsFromDuplicates" + ${dupeShards}
          RETURNING (xmax = 0) AS inserted`;
        const isNew = Boolean(upserted[0]?.inserted);
        rows.push({
          id: randomUUID(),
          pullId: pull.id,
          characterId: r.characterId,
          rarity: r.rarity,
          position,
          isNew,
          isGuaranteed: r.isGuaranteed,
          isFeatured: r.isFeatured,
          shardsAwarded: isNew ? 0 : dupeShards,
        });
      }
      await tx.gachaResult.createMany({ data: rows });

      for (const row of rows) {
        if (row.shardsAwarded > 0) {
          await applyWalletChange(tx, {
            userId,
            currency: "SHARD",
            amount: row.shardsAwarded,
            type: "DUPLICATE_CONVERSION",
            referenceType: "GachaResult",
            referenceId: row.id,
            description: `Duplikat ${row.rarity}★ dikonversi menjadi shard`,
            metadata: { characterId: row.characterId, rarity: row.rarity, pullId: pull.id },
          });
        }
      }
      return pull.id;
    });
    return outcome(pullId, userId, false);
  } catch (error) {
    if (isUniqueViolation(error)) {
      const again = await prisma.gachaPull.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey } } });
      if (again) return outcome(again.id, userId, true);
      throw new AppError("CONFLICT", "Request bertabrakan dengan request lain. Coba lagi.");
    }
    throw error;
  }
}

export async function listPullHistory(userId: string, page: number, pageSize: number) {
  const [items, total] = await Promise.all([
    prisma.gachaPull.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        banner: { select: { name: true } },
        results: { orderBy: { position: "asc" }, include: { character: { select: { name: true, rarity: true, imageUrl: true } } } },
      },
    }),
    prisma.gachaPull.count({ where: { userId } }),
  ]);
  return { items, total };
}
