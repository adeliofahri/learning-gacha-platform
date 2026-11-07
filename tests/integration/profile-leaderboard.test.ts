import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { PATCH as profileRoute } from "@/app/api/profile/route";
import { GET as leaderboardRoute } from "@/app/api/leaderboard/route";
import { getPublicProfile } from "@/server/services/collection.service";
import { createAdmin, makeCharacter, makeMcQuestion, registerStudent, req, resetDb } from "./helpers";

beforeEach(resetDb);

async function own(userId: string, characterId: string, firstObtainedAt = new Date(), quantity = 1) {
  return prisma.inventoryItem.create({ data: { userId, characterId, quantity, firstObtainedAt, lastObtainedAt: firstObtainedAt } });
}

describe("avatar", () => {
  it("tidak bisa memilih avatar yang tidak dimiliki", async () => {
    const s = await registerStudent();
    const c = await makeCharacter(5);
    const res = await profileRoute(req("/api/profile", { method: "PATCH", token: s.token, body: { avatarCharacterId: c.id } }));
    expect(res.status).toBe(403);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: s.id } })).avatarCharacterId).toBeNull();
  });

  it("bisa memilih avatar dari karakter milik sendiri (termasuk yang diarsipkan)", async () => {
    const s = await registerStudent();
    const c = await makeCharacter(5);
    await own(s.id, c.id);
    await prisma.character.update({ where: { id: c.id }, data: { status: "ARCHIVED" } });
    const res = await profileRoute(
      req("/api/profile", { method: "PATCH", token: s.token, body: { avatarCharacterId: c.id, isPublic: true } }),
    );
    expect(res.status).toBe(200);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: s.id } })).toMatchObject({ avatarCharacterId: c.id, isPublic: true });
  });
});

describe("profil publik", () => {
  it("tidak membocorkan email/hash; koleksi hanya bila publik", async () => {
    const s = await registerStudent();
    const c = await makeCharacter(4);
    await own(s.id, c.id);
    const priv = await getPublicProfile(s.username);
    expect(priv.collection).toBeNull();
    expect(priv.totalStars).toBe(4);
    const serialized = JSON.stringify(priv);
    expect(serialized).not.toContain("@test.local");
    expect(serialized).not.toContain("argon2");
    await prisma.user.update({ where: { id: s.id }, data: { isPublic: true } });
    expect((await getPublicProfile(s.username)).collection).toHaveLength(1);
  });
});

describe("leaderboard", () => {
  it("lifetime: SUM rarity karakter unik; tanpa data privat", async () => {
    const a = await registerStudent("aa");
    const b = await registerStudent("bb");
    const c6 = await makeCharacter(6);
    const c3 = await makeCharacter(3);
    const c1 = await makeCharacter(1);
    await own(a.id, c6.id);
    await prisma.inventoryItem.update({ where: { userId_characterId: { userId: a.id, characterId: c6.id } }, data: { duplicateCount: 5 } });
    await own(b.id, c3.id);
    await own(b.id, c1.id);
    const res = await leaderboardRoute(req("/api/leaderboard?period=lifetime"));
    const body = await res.json();
    expect(body.entries.map((e: { username: string; score: number }) => [e.username, e.score])).toEqual([
      [a.username, 6],
      [b.username, 4],
    ]);
    const raw = JSON.stringify(body);
    expect(raw).not.toContain("@test.local");
    expect(raw).not.toContain("userId");
    expect(raw).not.toContain(a.id);
    expect(Object.keys(body.entries[0]).sort()).toEqual(
      ["avatarName", "avatarUrl", "rank", "reachedAt", "score", "solvedCount", "username"].sort(),
    );
  });

  it("monthly: hanya karakter yang pertama kali diperoleh pada bulan itu (Asia/Jakarta)", async () => {
    const a = await registerStudent("mm");
    const old = await makeCharacter(6);
    const fresh = await makeCharacter(2);
    await own(a.id, old.id, new Date("2026-10-31T16:59:00Z")); // 31 Okt 23:59 WIB
    await own(a.id, fresh.id, new Date("2026-10-31T17:01:00Z")); // 1 Nov 00:01 WIB
    const nov = await (await leaderboardRoute(req("/api/leaderboard?period=monthly&month=2026-11"))).json();
    expect(nov.entries[0].score).toBe(2);
    const oct = await (await leaderboardRoute(req("/api/leaderboard?period=monthly&month=2026-10"))).json();
    expect(oct.entries[0].score).toBe(6);
    const life = await (await leaderboardRoute(req("/api/leaderboard"))).json();
    expect(life.entries[0].score).toBe(8);
  });

  it("tie-break: soal solved lebih banyak menang, lalu waktu pencapaian lebih awal", async () => {
    const admin = await createAdmin();
    const x = await registerStudent("xx");
    const y = await registerStudent("yy");
    const z = await registerStudent("zz");
    const c = await makeCharacter(5);
    await own(x.id, c.id, new Date("2026-11-03T00:00:00Z"));
    await own(y.id, c.id, new Date("2026-11-05T00:00:00Z"));
    await own(z.id, c.id, new Date("2026-11-04T00:00:00Z"));
    const q = await makeMcQuestion(admin.id);
    const att = await prisma.attempt.create({
      data: { userId: y.id, questionId: q.id, questionVersion: 1, status: "CORRECT", snapshot: {}, idempotencyKey: "k-y-1" },
    });
    await prisma.questionSolve.create({ data: { userId: y.id, questionId: q.id, attemptId: att.id, bountyAwarded: 10 } });
    const body = await (await leaderboardRoute(req("/api/leaderboard"))).json();
    expect(body.entries.map((e: { username: string }) => e.username)).toEqual([y.username, x.username, z.username]);
  });

  it("siswa suspended dan admin tidak muncul", async () => {
    const a = await registerStudent();
    const c = await makeCharacter(3);
    await own(a.id, c.id);
    await prisma.user.update({ where: { id: a.id }, data: { status: "SUSPENDED" } });
    const body = await (await leaderboardRoute(req("/api/leaderboard"))).json();
    expect(body.entries).toHaveLength(0);
  });
});
