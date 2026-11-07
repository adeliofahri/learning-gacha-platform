import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type LeaderboardEntry = {
  rank: number;
  username: string;
  avatarUrl: string | null;
  avatarName: string | null;
  score: number;
  solvedCount: number;
  reachedAt: Date | null;
};

type Range = { start: Date; end: Date } | null;

function rankedQuery(range: Range) {
  const invRange = range
    ? Prisma.sql`AND i."firstObtainedAt" >= ${range.start} AND i."firstObtainedAt" < ${range.end}`
    : Prisma.empty;
  const solveRange = range
    ? Prisma.sql`WHERE s."solvedAt" >= ${range.start} AND s."solvedAt" < ${range.end}`
    : Prisma.empty;
  // Skor = SUM(rarity) karakter unik (satu baris inventory per karakter → duplikat tidak dihitung).
  return Prisma.sql`
    WITH scores AS (
      SELECT i."userId", SUM(c."rarity")::int AS score, MAX(i."firstObtainedAt") AS "reachedAt"
      FROM "InventoryItem" i JOIN "Character" c ON c."id" = i."characterId"
      WHERE i."quantity" > 0 ${invRange}
      GROUP BY i."userId"
    ),
    solved AS (
      SELECT s."userId", COUNT(*)::int AS "solvedCount" FROM "QuestionSolve" s ${solveRange} GROUP BY s."userId"
    ),
    ranked AS (
      SELECT u."id" AS "userId", u."username", av."imageUrl" AS "avatarUrl", av."name" AS "avatarName",
             sc.score, COALESCE(so."solvedCount", 0) AS "solvedCount", sc."reachedAt",
             ROW_NUMBER() OVER (ORDER BY sc.score DESC, COALESCE(so."solvedCount", 0) DESC,
                                         sc."reachedAt" ASC, u."username" ASC)::int AS rank
      FROM "User" u
      JOIN scores sc ON sc."userId" = u."id"
      LEFT JOIN solved so ON so."userId" = u."id"
      LEFT JOIN "Character" av ON av."id" = u."avatarCharacterId"
      WHERE u."role" = 'STUDENT' AND u."status" = 'ACTIVE' AND sc.score > 0
    )`;
}

/** Leaderboard publik: hanya username, avatar, skor (+ data tie-break non-privat). */
export async function getLeaderboard(range: Range, limit = 50): Promise<LeaderboardEntry[]> {
  const rows = await prisma.$queryRaw<(LeaderboardEntry & { userId: string })[]>`
    ${rankedQuery(range)}
    SELECT * FROM ranked ORDER BY rank ASC LIMIT ${limit}`;
  return rows.map(({ userId: _userId, ...r }) => r);
}

export async function getUserRank(userId: string, range: Range): Promise<LeaderboardEntry | null> {
  const rows = await prisma.$queryRaw<(LeaderboardEntry & { userId: string })[]>`
    ${rankedQuery(range)}
    SELECT * FROM ranked WHERE "userId" = ${userId}`;
  const row = rows[0];
  if (!row) return null;
  const { userId: _userId, ...rest } = row;
  return rest;
}
