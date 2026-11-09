import { prisma, transaction, isUniqueViolation } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import type { EventInput } from "@/lib/validation/economy";
import { applyWalletChange } from "./wallet.service";
import { logAudit } from "./audit.service";

export function isEventOpen(e: { status: string; startsAt: Date; endsAt: Date }, now = new Date()) {
  return e.status === "ACTIVE" && now >= e.startsAt && now < e.endsAt;
}

export async function createEvent(adminId: string, input: EventInput) {
  return transaction(async (tx) => {
    const ev = await tx.event.create({
      data: { ...input, maxClaims: input.maxClaims ?? null, createdById: adminId },
    });
    await logAudit(tx, {
      actorId: adminId,
      action: "EVENT_CREATE",
      targetType: "Event",
      targetId: ev.id,
      metadata: { name: ev.name, coinReward: ev.coinReward },
    });
    return ev;
  });
}

export async function updateEvent(adminId: string, id: string, input: EventInput) {
  return transaction(async (tx) => {
    const exists = await tx.event.findUnique({ where: { id } });
    if (!exists) throw notFound("Event");
    const ev = await tx.event.update({
      where: { id },
      data: { ...input, maxClaims: input.maxClaims ?? null },
    });
    await logAudit(tx, {
      actorId: adminId,
      action: "EVENT_UPDATE",
      targetType: "Event",
      targetId: id,
      metadata: { name: ev.name, status: ev.status },
    });
    return ev;
  });
}

export async function deleteEvent(adminId: string, id: string) {
  return transaction(async (tx) => {
    // Kunci baris Event agar tidak terjadi klaim bersamaan
    // dengan proses penghapusan.
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "Event"
      WHERE "id" = ${id}
      FOR UPDATE
    `;

    if (locked.length === 0) throw notFound("Event");

    const event = await tx.event.findUnique({
      where: { id },
      include: {
        _count: { select: { claims: true } },
      },
    });

    if (!event) throw notFound("Event");

    if (event._count.claims > 0) {
      throw new AppError(
        "CONFLICT",
        `Event tidak dapat dihapus karena sudah memiliki ${event._count.claims} klaim.`,
      );
    }

    await logAudit(tx, {
      actorId: adminId,
      action: "EVENT_DELETE",
      targetType: "Event",
      targetId: id,
      metadata: {
        name: event.name,
        coinReward: event.coinReward,
        claims: event._count.claims,
      },
    });

    await tx.event.delete({
      where: { id },
    });

    return {
      id: event.id,
      name: event.name,
    };
  });
}

export async function listEventsForStudent(userId: string, now = new Date()) {
  const [events, claims, solved] = await Promise.all([
    prisma.event.findMany({
      where: { status: "ACTIVE", endsAt: { gt: now } },
      include: { _count: { select: { claims: true } } },
      orderBy: { endsAt: "asc" },
    }),
    prisma.eventClaim.findMany({ where: { userId }, select: { eventId: true, claimedAt: true } }),
    prisma.questionSolve.count({ where: { userId } }),
  ]);
  const claimed = new Map(claims.map((c) => [c.eventId, c.claimedAt]));
  return events.map((e) => {
    const full = e.maxClaims !== null && e._count.claims >= e.maxClaims;
    const open = isEventOpen(e, now);
    return {
      ...e,
      claimedAt: claimed.get(e.id) ?? null,
      eligible: solved >= e.minSolved,
      full,
      open,
      canClaim: open && !full && !claimed.has(e.id) && solved >= e.minSolved,
    };
  });
}

/** Klaim bonus event: sekali per siswa (unique), batas global dikunci FOR UPDATE, dalam satu transaksi. */
export async function claimEvent(userId: string, eventId: string, now = new Date()) {
  try {
    return await transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        { id: string }[]
      >`SELECT "id" FROM "Event" WHERE "id" = ${eventId} FOR UPDATE`;
      if (locked.length === 0) throw notFound("Event");
      const ev = await tx.event.findUniqueOrThrow({ where: { id: eventId } });
      if (!isEventOpen(ev, now)) throw new AppError("CONFLICT", "Event tidak sedang berlangsung");
      const already = await tx.eventClaim.findUnique({
        where: { eventId_userId: { eventId, userId } },
      });
      if (already) throw new AppError("CONFLICT", "Bonus event ini sudah kamu klaim");
      if (ev.minSolved > 0) {
        const solved = await tx.questionSolve.count({ where: { userId } });
        if (solved < ev.minSolved) {
          throw new AppError(
            "FORBIDDEN",
            `Selesaikan minimal ${ev.minSolved} soal untuk mengklaim bonus ini`,
          );
        }
      }
      if (ev.maxClaims !== null) {
        const count = await tx.eventClaim.count({ where: { eventId } });
        if (count >= ev.maxClaims) throw new AppError("CONFLICT", "Kuota klaim event sudah habis");
      }
      const claim = await tx.eventClaim.create({
        data: { eventId, userId, amount: ev.coinReward },
      });
      await applyWalletChange(tx, {
        userId,
        currency: "COIN",
        amount: ev.coinReward,
        type: "EVENT_BONUS",
        referenceType: "Event",
        referenceId: eventId,
        description: `Bonus event: ${ev.name}`,
        metadata: { claimId: claim.id },
      });
      return claim;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("CONFLICT", "Bonus event ini sudah kamu klaim");
    throw e;
  }
}
