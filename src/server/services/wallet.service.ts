import { Prisma, type Currency, type TransactionType } from "@prisma/client";
import { prisma, transaction, type Tx } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import { logAudit } from "./audit.service";

export type WalletChange = {
  userId: string;
  currency: Currency;
  amount: number; // positif = tambah, negatif = kurang
  type: TransactionType;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  metadata?: Prisma.InputJsonValue;
  actorId?: string;
};

/**
 * Satu-satunya jalur perubahan saldo. Update bersyarat atomik (tidak bisa negatif) + ledger.
 * Wajib dipanggil di dalam transaksi DB.
 */
export async function applyWalletChange(tx: Tx, change: WalletChange) {
  if (!Number.isInteger(change.amount) || change.amount === 0) {
    throw new AppError("BAD_REQUEST", "Jumlah transaksi tidak valid");
  }
  const rows =
    change.currency === "COIN"
      ? await tx.$queryRaw<{ balance: number }[]>`
          UPDATE "Wallet" SET "coins" = "coins" + ${change.amount}, "updatedAt" = NOW()
          WHERE "userId" = ${change.userId} AND "coins" + ${change.amount} >= 0
          RETURNING "coins" AS balance`
      : await tx.$queryRaw<{ balance: number }[]>`
          UPDATE "Wallet" SET "shards" = "shards" + ${change.amount}, "updatedAt" = NOW()
          WHERE "userId" = ${change.userId} AND "shards" + ${change.amount} >= 0
          RETURNING "shards" AS balance`;

  if (rows.length === 0) {
    const exists = await tx.wallet.findUnique({ where: { userId: change.userId }, select: { userId: true } });
    if (!exists) throw notFound("Wallet");
    throw new AppError(
      "INSUFFICIENT_FUNDS",
      change.currency === "COIN" ? "Koin tidak cukup" : "Shard tidak cukup",
    );
  }
  const balanceAfter = Number(rows[0]!.balance);
  return tx.walletTransaction.create({
    data: {
      userId: change.userId,
      currency: change.currency,
      amount: change.amount,
      balanceAfter,
      type: change.type,
      referenceType: change.referenceType,
      referenceId: change.referenceId,
      description: change.description,
      metadata: change.metadata,
      actorId: change.actorId,
    },
  });
}

export async function getWallet(userId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  return wallet ?? { userId, coins: 0, shards: 0, updatedAt: new Date() };
}

export async function listTransactions(userId: string, page = 1, pageSize = 20) {
  const [items, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.walletTransaction.count({ where: { userId } }),
  ]);
  return { items, total, page, pageSize };
}

/** Penyesuaian koin oleh admin — wajib alasan, tercatat di ledger dan audit log. */
export async function adminAdjustCoins(params: {
  adminId: string;
  userId: string;
  amount: number;
  reason: string;
}) {
  return transaction(async (tx) => {
    const target = await tx.user.findUnique({ where: { id: params.userId }, select: { role: true } });
    if (!target) throw notFound("User");
    if (target.role !== "STUDENT") throw new AppError("BAD_REQUEST", "Hanya wallet siswa yang bisa disesuaikan");
    const record = await applyWalletChange(tx, {
      userId: params.userId,
      currency: "COIN",
      amount: params.amount,
      type: "ADMIN_ADJUSTMENT",
      description: params.reason,
      actorId: params.adminId,
      metadata: { reason: params.reason },
    });
    await logAudit(tx, {
      actorId: params.adminId,
      action: "WALLET_ADJUST",
      targetType: "User",
      targetId: params.userId,
      metadata: { amount: params.amount, reason: params.reason, transactionId: record.id },
    });
    return record;
  });
}
