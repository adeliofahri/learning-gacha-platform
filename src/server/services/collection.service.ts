import { prisma, transaction, isUniqueViolation } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import type { CharacterInput } from "@/lib/validation/collection";
import { logAudit } from "./audit.service";
import { applyWalletChange } from "./wallet.service";

export async function listInventory(userId: string, filters: { rarity?: number } = {}) {
  return prisma.inventoryItem.findMany({
    where: {
      userId,
      quantity: { gt: 0 },
      character: filters.rarity ? { rarity: filters.rarity } : undefined,
    },
    include: { character: true },
    orderBy: [{ character: { rarity: "desc" } }, { firstObtainedAt: "desc" }],
  });
}

export async function getInventoryItem(userId: string, characterId: string) {
  const item = await prisma.inventoryItem.findUnique({
    where: { userId_characterId: { userId, characterId } },
    include: { character: true },
  });
  if (!item) throw notFound("Karakter di koleksi");
  const history = await prisma.gachaResult.findMany({
    where: { characterId, pull: { userId } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      pull: { select: { pullType: true, banner: { select: { name: true } }, createdAt: true } },
    },
  });
  return { item, history };
}

/** Avatar hanya dari karakter milik user — diverifikasi di server. */
export async function updateProfile(
  userId: string,
  input: { isPublic?: boolean; avatarCharacterId?: string | null },
) {
  if (input.avatarCharacterId) {
    const owned = await prisma.inventoryItem.findUnique({
      where: { userId_characterId: { userId, characterId: input.avatarCharacterId } },
    });
    if (!owned || owned.quantity <= 0) {
      throw new AppError("FORBIDDEN", "Avatar hanya dapat dipilih dari karakter yang kamu miliki");
    }
  }
  return prisma.user.update({
    where: { id: userId },
    data: { isPublic: input.isPublic, avatarCharacterId: input.avatarCharacterId },
    select: { id: true, username: true, isPublic: true, avatarCharacterId: true },
  });
}

export async function getProfileSummary(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { username: true, isPublic: true, avatarCharacter: true, avatarCharacterId: true },
  });
  const stars = await totalStars(userId);
  return { ...user, totalStars: stars };
}

export async function totalStars(userId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ score: number | null }[]>`
    SELECT SUM(c."rarity")::int AS score FROM "InventoryItem" i
    JOIN "Character" c ON c."id" = i."characterId"
    WHERE i."userId" = ${userId} AND i."quantity" > 0`;
  return Number(rows[0]?.score ?? 0);
}

/** Profil publik: TIDAK pernah mengembalikan email, hash password, saldo, atau data privat. */
export async function getPublicProfile(username: string) {
  const user = await prisma.user.findFirst({
    where: { username, role: "STUDENT", status: "ACTIVE" },
    select: {
      id: true,
      username: true,
      isPublic: true,
      createdAt: true,
      avatarCharacter: { select: { name: true, imageUrl: true, rarity: true } },
    },
  });
  if (!user) throw notFound("Profil");
  const stars = await totalStars(user.id);
  const collection = user.isPublic
    ? (
        await prisma.inventoryItem.findMany({
          where: { userId: user.id, quantity: { gt: 0 } },
          include: {
            character: { select: { id: true, name: true, rarity: true, imageUrl: true } },
          },
          orderBy: [{ character: { rarity: "desc" } }, { firstObtainedAt: "asc" }],
        })
      ).map((i) => i.character)
    : null;
  return {
    username: user.username,
    avatar: user.avatarCharacter,
    totalStars: stars,
    isPublic: user.isPublic,
    memberSince: user.createdAt,
    collection,
  };
}

// ───────────────────────────── Admin: karakter ─────────────────────────────

export async function createCharacter(adminId: string, input: CharacterInput) {
  try {
    return await transaction(async (tx) => {
      const c = await tx.character.create({ data: input });
      await logAudit(tx, {
        actorId: adminId,
        action: "CHARACTER_CREATE",
        targetType: "Character",
        targetId: c.id,
        metadata: { name: c.name, rarity: c.rarity },
      });
      return c;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("CONFLICT", "Nama karakter sudah dipakai");
    throw e;
  }
}

export async function updateCharacter(adminId: string, id: string, input: CharacterInput) {
  try {
    return await transaction(async (tx) => {
      const before = await tx.character.findUnique({ where: { id } });
      if (!before) throw notFound("Karakter");
      if (before.rarity !== input.rarity) {
        const owned = await tx.inventoryItem.count({ where: { characterId: id } });
        if (owned > 0) {
          throw new AppError(
            "CONFLICT",
            "Rarity tidak dapat diubah karena karakter sudah dimiliki siswa (mempengaruhi leaderboard).",
          );
        }
      }
      const c = await tx.character.update({ where: { id }, data: input });
      await logAudit(tx, {
        actorId: adminId,
        action: "CHARACTER_UPDATE",
        targetType: "Character",
        targetId: id,
        metadata: { name: c.name, status: c.status },
      });
      return c;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("CONFLICT", "Nama karakter sudah dipakai");
    throw e;
  }
}

export async function getCharacterDeletePreview(id: string) {
  const character = await prisma.character.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      rarity: true,
    },
  });

  if (!character) throw notFound("Karakter");

  const owners = await prisma.inventoryItem.findMany({
    where: {
      characterId: id,
      quantity: { gt: 0 },
      user: { role: "STUDENT" },
    },
    select: {
      userId: true,
      quantity: true,
      shardsFromDuplicates: true,
    },
  });

  const totalRefund = owners.reduce(
    (total, item) => total + 100 * character.rarity * item.quantity,
    0,
  );

  return {
    characterId: character.id,
    characterName: character.name,
    rarity: character.rarity,
    affectedStudents: owners.length,
    totalCopies: owners.reduce((total, item) => total + item.quantity, 0),
    totalRefund,
  };
}

export async function deleteCharacter(adminId: string, id: string) {
  return transaction(async (tx) => {
    // Lock karakter agar dua proses penghapusan tidak berjalan bersamaan.
    const characters = await tx.$queryRaw<
      { id: string; name: string; rarity: number }[]
    >`
      SELECT "id", "name", "rarity"
      FROM "Character"
      WHERE "id" = ${id}
      FOR UPDATE
    `;

    const character = characters[0];
    if (!character) throw notFound("Karakter");

    const owners = await tx.inventoryItem.findMany({
      where: {
        characterId: id,
        quantity: { gt: 0 },
        user: { role: "STUDENT" },
      },
      select: {
        userId: true,
        quantity: true,
        shardsFromDuplicates: true,
      },
    });

    let totalRefund = 0;
    let totalCopies = 0;

    // Refund setiap siswa berdasarkan jumlah salinan yang dimiliki.
    for (const item of owners) {
      const amount = item.shardsFromDuplicates;

      if (!Number.isSafeInteger(amount) || amount < 0) {
        throw new AppError("BAD_REQUEST", "Jumlah refund tidak valid");
      }

      // Tidak perlu membuat wallet atau transaksi jika refund 0.
      if (amount > 0) {
        await tx.wallet.upsert({
          where: { userId: item.userId },
          create: { userId: item.userId },
          update: {},
        });

        await applyWalletChange(tx, {
          userId: item.userId,
          currency: "SHARD",
          amount,
          type: "CHARACTER_DELETE_REFUND",
          referenceType: "CHARACTER_DELETION",
          referenceId: id,
          description: `Refund penghapusan karakter ${character.name} (${character.rarity}★)`,
          metadata: {
            characterId: id,
            characterName: character.name,
            rarity: character.rarity,
            quantity: item.quantity,
            shardsFromDuplicates: item.shardsFromDuplicates,
            refundMethod: "DUPLICATE_CONVERSION",
          },
          actorId: adminId,
        });
      }

      totalRefund += amount;
      totalCopies += item.quantity;
    }

    // Pertahankan riwayat gacha, lepaskan relasi ke karakter.
    await tx.gachaResult.updateMany({
      where: { characterId: id },
      data: { characterId: null },
    });

    // Hapus karakter dari seluruh banner.
    await tx.bannerCharacter.deleteMany({
      where: { characterId: id },
    });

    // Lepaskan karakter dari avatar pengguna.
    await tx.user.updateMany({
      where: { avatarCharacterId: id },
      data: { avatarCharacterId: null },
    });

    // Hapus dari seluruh inventory.
    await tx.inventoryItem.deleteMany({
      where: { characterId: id },
    });

    // Hapus karakter setelah seluruh relasinya ditangani.
    await tx.character.delete({
      where: { id },
    });

    // Catat aktivitas admin.
    await logAudit(tx, {
      actorId: adminId,
      action: "CHARACTER_DELETE",
      targetType: "Character",
      targetId: id,
      metadata: {
        name: character.name,
        rarity: character.rarity,
        affectedStudents: owners.length,
        totalCopies,
        totalRefund,
      },
    });

    return {
      characterName: character.name,
      rarity: character.rarity,
      affectedStudents: owners.length,
      totalCopies,
      totalRefund,
    };
  });
}