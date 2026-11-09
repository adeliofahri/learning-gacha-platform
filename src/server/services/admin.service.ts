import { Prisma, type UserStatus } from "@prisma/client";
import { prisma, transaction } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import { logAudit } from "./audit.service";
import { applyWalletChange } from "./wallet.service";

export async function getOverview() {
  const [students, publishedQuestions, packages, characters, attempts, pendingReviews, sums] =
    await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.question.count({ where: { status: "PUBLISHED" } }),
      prisma.package.count({ where: { status: { not: "ARCHIVED" } } }),
      prisma.character.count({ where: { status: "ACTIVE" } }),
      prisma.attempt.count(),
      prisma.attempt.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.walletTransaction.groupBy({
        by: ["type"],
        where: { currency: "COIN" },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);
  const circulating = await prisma.wallet.aggregate({ _sum: { coins: true, shards: true } });
  return {
    students,
    publishedQuestions,
    packages,
    characters,
    attempts,
    pendingReviews,
    coinSummary: sums.map((s) => ({
      type: s.type,
      total: s._sum.amount ?? 0,
      count: s._count._all,
    })),
    circulatingCoins: circulating._sum.coins ?? 0,
    circulatingShards: circulating._sum.shards ?? 0,
  };
}

export async function listStudents(search: string | undefined, page: number, pageSize: number) {
  const where: Prisma.UserWhereInput = {
    role: "STUDENT",
    username: search ? { contains: search.toLowerCase(), mode: "insensitive" } : undefined,
  };
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
        createdAt: true,
        wallet: { select: { coins: true, shards: true } },
        _count: { select: { solves: true, inventory: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total };
}

export async function getStudentDetail(id: string) {
  const user = await prisma.user.findFirst({
    where: { id, role: "STUDENT" },
    select: {
      id: true,
      username: true,
      email: true,
      status: true,
      isPublic: true,
      createdAt: true,
      wallet: true,
      inventory: { include: { character: true }, orderBy: { character: { rarity: "desc" } } },
      _count: { select: { solves: true, attempts: true, pulls: true } },
    },
  });
  if (!user) throw notFound("Siswa");
  const transactions = await prisma.walletTransaction.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { actor: { select: { username: true } } },
  });
  return { user, transactions };
}

export async function setUserStatus(adminId: string, userId: string, status: UserStatus) {
  return transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: userId } });
    if (!target) throw notFound("User");
    if (target.role !== "STUDENT")
      throw new AppError("BAD_REQUEST", "Status admin tidak dapat diubah dari sini");
    const user = await tx.user.update({ where: { id: userId }, data: { status } });
    if (status === "SUSPENDED") await tx.session.deleteMany({ where: { userId } });
    await logAudit(tx, {
      actorId: adminId,
      action: "USER_STATUS",
      targetType: "User",
      targetId: userId,
      metadata: { status },
    });
    return user;
  });
}


export async function updateEconomySettings(
  adminId: string,
  input: {
    bounties: Record<"EASY" | "MEDIUM" | "HARD" | "EXPERT", number>;
    shards: Record<string, number>;
    unlockShardCost: number;
  },
) {
  return transaction(async (tx) => {
    // Update konfigurasi bounty dan seluruh soal terkait.
    for (const [difficulty, bounty] of Object.entries(input.bounties)) {
      const typedDifficulty =
        difficulty as keyof typeof input.bounties;

      await tx.difficultyConfig.upsert({
        where: { difficulty: typedDifficulty },
        create: {
          difficulty: typedDifficulty,
          bounty,
        },
        update: { bounty },
      });

      // Terapkan bounty terbaru ke seluruh soal dengan difficulty tersebut.
      await tx.question.updateMany({
        where: { difficulty: typedDifficulty },
        data: { bounty },
      });
    }

    // Update konfigurasi konversi duplicate menjadi shard.
    for (const [rarity, shards] of Object.entries(input.shards)) {
      await tx.duplicateShardConfig.upsert({
        where: { rarity: Number(rarity) },
        create: { rarity: Number(rarity), shards },
        update: { shards },
      });
    }

    await tx.questionUnlockConfig.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        shardCost: input.unlockShardCost,
      },
      update: {
        shardCost: input.unlockShardCost,
      },
    });

    await logAudit(tx, {
      actorId: adminId,
      action: "SETTINGS_UPDATE",
      targetType: "Settings",
      metadata: input,
    });
  });
}


export async function listAuditLogs(filters: { action?: string; page: number; pageSize: number }) {
  const where: Prisma.AuditLogWhereInput = { action: filters.action || undefined };
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { items, total };
}

export async function getRarityStyles() {
  const rows = await prisma.rarityStyle.findMany({
    orderBy: { rarity: "asc" },
  });

  const defaults = [
    { rarity: 1, borderType: "PRESET" as const },
    { rarity: 2, borderType: "PRESET" as const },
    { rarity: 3, borderType: "PRESET" as const },
    { rarity: 4, borderType: "PRESET" as const },
    {
      rarity: 5,
      borderType: "GRADIENT" as const,
      borderConfig: { colors: ["#FDE68A", "#F59E0B", "#B45309"], angle: 135 },
    },
    {
      rarity: 6,
      borderType: "GRADIENT" as const,
      borderConfig: { colors: ["#A855F7", "#E11D48", "#FACC15"], angle: 135 },
    },
  ];

  return defaults.map((fallback) => {
    const saved = rows.find((row) => row.rarity === fallback.rarity);

    return {
      ...fallback,
      borderType: saved?.borderType ?? fallback.borderType,
      borderConfig: saved?.borderConfig ?? fallback.borderConfig ?? null,
      borderImageUrl: saved?.borderImageUrl ?? null,
    };
  });
}

export async function updateRarityStyle(
  adminId: string,
  input: {
    rarity: number;
    borderType: "PRESET" | "GRADIENT" | "IMAGE";
    borderConfig?: {
      colors: string[];
      angle: number;
    } | null;
    borderImageUrl: string | null;
  },
) {
  return transaction(async (tx) => {
    await tx.rarityStyle.upsert({
      where: { rarity: input.rarity },
      create: {
        rarity: input.rarity,
        borderType: input.borderType,
        borderConfig: input.borderConfig ?? Prisma.DbNull,
        borderImageUrl: input.borderImageUrl,
      },
      update: {
        borderType: input.borderType,
        borderConfig: input.borderConfig ?? undefined,
        borderImageUrl: input.borderImageUrl,
      },
    });

    await logAudit(tx, {
      actorId: adminId,
      action: "RARITY_STYLE_UPDATE",
      targetType: "RarityStyle",
      targetId: String(input.rarity),
      metadata: input,
    });
  });
}

export async function resetAllStudentStats(adminId: string) {
  const now = new Date();

  return prisma.$transaction(
    async (tx) => {
      const students = await tx.user.count({
        where: { role: "STUDENT" },
      });

      // Ambil saldo seluruh siswa untuk pencatatan ledger.
      const wallets = await tx.wallet.findMany({
        where: {
          user: { role: "STUDENT" },
        },
        select: {
          userId: true,
          coins: true,
          shards: true,
        },
      });

      // Hapus seluruh koleksi karakter.
      const inventory = await tx.inventoryItem.deleteMany({
        where: {
          user: { role: "STUDENT" },
        },
      });

      // Reset seluruh penyelesaian soal.
      const solves = await tx.questionSolve.deleteMany({
        where: {
          user: { role: "STUDENT" },
        },
      });

      // Reset progres paket belajar.
      const packageProgress = await tx.packageProgress.deleteMany({
        where: {
          user: { role: "STUDENT" },
        },
      });

      // Reset progres Step-Up.
      const stepUpProgress = await tx.stepUpProgress.deleteMany({
        where: {
          user: { role: "STUDENT" },
        },
      });

      // Hapus cooldown agar siswa memulai tanpa cooldown lama.
      const cooldowns = await tx.questionCooldown.deleteMany({
        where: {
          user: { role: "STUDENT" },
        },
      });

      // Kembalikan avatar karakter ke default.
      await tx.user.updateMany({
        where: { role: "STUDENT" },
        data: {
          avatarCharacterId: null,
          statsResetAt: now,
        },
      });

      let coinsRemoved = 0;
      let shardsRemoved = 0;

      // Nolkan saldo melalui wallet ledger.
      for (const wallet of wallets) {
        if (wallet.coins > 0) {
          await applyWalletChange(tx, {
            userId: wallet.userId,
            currency: "COIN",
            amount: -wallet.coins,
            type: "ADMIN_ADJUSTMENT",
            description: "Reset seluruh statistik siswa",
            actorId: adminId,
            metadata: {
              reason: "RESET_ALL_STUDENT_STATS",
            },
          });

          coinsRemoved += wallet.coins;
        }

        if (wallet.shards > 0) {
          await applyWalletChange(tx, {
            userId: wallet.userId,
            currency: "SHARD",
            amount: -wallet.shards,
            type: "ADMIN_ADJUSTMENT",
            description: "Reset seluruh statistik siswa",
            actorId: adminId,
            metadata: {
              reason: "RESET_ALL_STUDENT_STATS",
            },
          });

          shardsRemoved += wallet.shards;
        }
      }

      // Satu audit log untuk keseluruhan operasi.
      await logAudit(tx, {
        actorId: adminId,
        action: "STUDENT_STATS_RESET_ALL",
        targetType: "User",
        metadata: {
          students,
          inventoryItemsDeleted: inventory.count,
          solvesDeleted: solves.count,
          packageProgressDeleted: packageProgress.count,
          stepUpProgressDeleted: stepUpProgress.count,
          cooldownsDeleted: cooldowns.count,
          coinsRemoved,
          shardsRemoved,
          resetAt: now.toISOString(),
        },
      });

      return {
        studentsReset: students,
        inventoryItemsDeleted: inventory.count,
        solvesDeleted: solves.count,
        packageProgressDeleted: packageProgress.count,
        stepUpProgressDeleted: stepUpProgress.count,
        cooldownsDeleted: cooldowns.count,
        coinsRemoved,
        shardsRemoved,
      };
    },
    {
      maxWait: 10000,
      timeout: 120000,
    },
  );
}