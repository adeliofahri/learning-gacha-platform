import { appTimezone } from "@/lib/env";
import {
  currentMonth,
  formatMonthKey,
  monthRange,
  parseMonthKey,
  type MonthKey,
} from "@/server/domain/leaderboard";
import { getLeaderboard, getUserRank } from "@/server/repositories/leaderboard.repository";

export type Period = "lifetime" | "monthly";

export function resolvePeriod(period: string | undefined, month: string | undefined) {
  const p: Period = period === "monthly" ? "monthly" : "lifetime";
  const tz = appTimezone();
  const key: MonthKey = parseMonthKey(month) ?? currentMonth(tz);
  return {
    period: p,
    month: key,
    monthKey: formatMonthKey(key),
    range: p === "monthly" ? monthRange(key, tz) : null,
  };
}

export async function leaderboard(period?: string, month?: string, limit = 50) {
  const r = resolvePeriod(period, month);
  return { period: r.period, month: r.monthKey, entries: await getLeaderboard(r.range, limit) };
}

export async function myRank(userId: string, period?: string, month?: string) {
  const r = resolvePeriod(period, month);
  return getUserRank(userId, r.range);
}
