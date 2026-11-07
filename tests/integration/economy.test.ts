import { beforeEach, describe, expect, it } from "vitest";
import { prisma, transaction } from "@/lib/db";
import { POST as adjustRoute } from "@/app/api/admin/users/[id]/adjust/route";
import { POST as claimRoute } from "@/app/api/events/[id]/claim/route";
import { applyWalletChange } from "@/server/services/wallet.service";
import {
  coins,
  createAdmin,
  ctx,
  giveCoins,
  makeMcQuestion,
  registerStudent,
  req,
  resetDb,
} from "./helpers";

beforeEach(resetDb);

describe("wallet", () => {
  it("saldo tidak bisa negatif (service & constraint DB)", async () => {
    const s = await registerStudent();
    await giveCoins(s.id, 50);
    await expect(
      transaction((tx) =>
        applyWalletChange(tx, { userId: s.id, currency: "COIN", amount: -51, type: "GACHA_SPEND" }),
      ),
    ).rejects.toThrow(/tidak cukup/);
    expect(await coins(s.id)).toBe(50);
    await expect(
      prisma.wallet.update({ where: { userId: s.id }, data: { coins: -1 } }),
    ).rejects.toThrow();
  });

  it("debit bersamaan tidak menghasilkan saldo negatif", async () => {
    const s = await registerStudent();
    await giveCoins(s.id, 100);
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () =>
        transaction((tx) =>
          applyWalletChange(tx, {
            userId: s.id,
            currency: "COIN",
            amount: -30,
            type: "GACHA_SPEND",
          }),
        ),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(3);
    expect(await coins(s.id)).toBe(10);
    expect(await prisma.walletTransaction.count({ where: { type: "GACHA_SPEND" } })).toBe(3);
  });

  it("admin adjustment wajib alasan, tercatat di ledger & audit log, tidak bisa membuat saldo negatif", async () => {
    const admin = await createAdmin();
    const s = await registerStudent();
    const noReason = await adjustRoute(
      req(`/api/admin/users/${s.id}/adjust`, { token: admin.token, body: { amount: 100 } }),
      ctx({ id: s.id }),
    );
    expect(noReason.status).toBe(400);
    const ok = await adjustRoute(
      req(`/api/admin/users/${s.id}/adjust`, {
        token: admin.token,
        body: { amount: 100, reason: "Hadiah lomba kelas" },
      }),
      ctx({ id: s.id }),
    );
    expect(ok.status).toBe(201);
    expect(await coins(s.id)).toBe(100);
    const tx = await prisma.walletTransaction.findFirstOrThrow({ where: { userId: s.id } });
    expect(tx).toMatchObject({
      type: "ADMIN_ADJUSTMENT",
      amount: 100,
      actorId: admin.id,
      description: "Hadiah lomba kelas",
    });
    const log = await prisma.auditLog.findFirstOrThrow({ where: { action: "WALLET_ADJUST" } });
    expect(log).toMatchObject({ actorId: admin.id, targetId: s.id });
    const neg = await adjustRoute(
      req(`/api/admin/users/${s.id}/adjust`, {
        token: admin.token,
        body: { amount: -500, reason: "Koreksi salah input" },
      }),
      ctx({ id: s.id }),
    );
    expect(neg.status).toBe(409);
    expect(await coins(s.id)).toBe(100);
  });
});

describe("event bonus", () => {
  const makeEvent = async (
    adminId: string,
    extra: Partial<{ maxClaims: number; minSolved: number; endsAt: Date }> = {},
  ) =>
    prisma.event.create({
      data: {
        name: "Bonus",
        description: "",
        coinReward: 200,
        startsAt: new Date(Date.now() - 1000),
        endsAt: extra.endsAt ?? new Date(Date.now() + 86_400_000),
        maxClaims: extra.maxClaims,
        minSolved: extra.minSolved ?? 0,
        createdById: adminId,
      },
    });

  it("hanya bisa diklaim sekali walau request bersamaan", async () => {
    const admin = await createAdmin();
    const s = await registerStudent();
    const ev = await makeEvent(admin.id);
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        claimRoute(
          req(`/api/events/${ev.id}/claim`, { token: s.token, body: {} }),
          ctx({ id: ev.id }),
        ),
      ),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(3);
    expect(await coins(s.id)).toBe(200);
    expect(await prisma.walletTransaction.count({ where: { type: "EVENT_BONUS" } })).toBe(1);
  });

  it("kuota global maxClaims dihormati", async () => {
    const admin = await createAdmin();
    const ev = await makeEvent(admin.id, { maxClaims: 2 });
    const students = await Promise.all([registerStudent(), registerStudent(), registerStudent()]);
    const results = await Promise.all(
      students.map((s) =>
        claimRoute(
          req(`/api/events/${ev.id}/claim`, { token: s.token, body: {} }),
          ctx({ id: ev.id }),
        ),
      ),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(2);
    expect(await prisma.eventClaim.count({ where: { eventId: ev.id } })).toBe(2);
  });

  it("event berakhir dan syarat minSolved ditolak", async () => {
    const admin = await createAdmin();
    const s = await registerStudent();
    const ended = await prisma.event.create({
      data: {
        name: "Lama",
        description: "",
        coinReward: 50,
        startsAt: new Date(Date.now() - 2e8),
        endsAt: new Date(Date.now() - 1e8),
        createdById: admin.id,
      },
    });
    expect(
      (
        await claimRoute(
          req(`/api/events/${ended.id}/claim`, { token: s.token, body: {} }),
          ctx({ id: ended.id }),
        )
      ).status,
    ).toBe(409);
    const ev = await makeEvent(admin.id, { minSolved: 1 });
    expect(
      (
        await claimRoute(
          req(`/api/events/${ev.id}/claim`, { token: s.token, body: {} }),
          ctx({ id: ev.id }),
        )
      ).status,
    ).toBe(403);
    // setelah menyelesaikan 1 soal → boleh klaim
    const q = await makeMcQuestion(admin.id);
    const attempt = await prisma.attempt.create({
      data: {
        userId: s.id,
        questionId: q.id,
        questionVersion: 1,
        status: "CORRECT",
        snapshot: {},
        idempotencyKey: "seed-attempt-1",
      },
    });
    await prisma.questionSolve.create({
      data: { userId: s.id, questionId: q.id, attemptId: attempt.id, bountyAwarded: 0 },
    });
    expect(
      (
        await claimRoute(
          req(`/api/events/${ev.id}/claim`, { token: s.token, body: {} }),
          ctx({ id: ev.id }),
        )
      ).status,
    ).toBe(201);
    expect(await coins(s.id)).toBe(200);
  });
});
