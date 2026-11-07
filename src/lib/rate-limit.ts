import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

export type RateLimitRule = { limit: number; windowSeconds: number };

export const RATE_LIMITS = {
  login: { limit: 10, windowSeconds: 15 * 60 },
  register: { limit: 5, windowSeconds: 60 * 60 },
  answer: { limit: 30, windowSeconds: 60 },
  gacha: { limit: 20, windowSeconds: 60 },
  claim: { limit: 10, windowSeconds: 60 },
} satisfies Record<string, RateLimitRule>;

/**
 * Fixed-window rate limiter berbasis PostgreSQL (atomic upsert). Tidak memerlukan Redis.
 * Melempar AppError RATE_LIMITED jika batas terlampaui.
 */
export async function enforceRateLimit(bucket: string, identity: string, rule: RateLimitRule) {
  if (process.env.DISABLE_RATE_LIMIT === "1" && process.env.NODE_ENV !== "production") return;
  const key = `${bucket}:${createHash("sha256").update(identity).digest("hex").slice(0, 32)}`;
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart")
    VALUES (${key}, 1, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < NOW() - make_interval(secs => ${rule.windowSeconds})
                     THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < NOW() - make_interval(secs => ${rule.windowSeconds})
                     THEN NOW() ELSE "RateLimit"."windowStart" END
    RETURNING "count"`;
  const count = Number(rows[0]?.count ?? 0);
  if (count > rule.limit) {
    throw new AppError("RATE_LIMITED", "Terlalu banyak percobaan. Coba lagi beberapa saat lagi.");
  }
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
