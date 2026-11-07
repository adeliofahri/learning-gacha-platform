import type { Prisma, UserStatus } from "@prisma/client";
import { prisma, transaction } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import { logAudit } from "./audit.service";

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
