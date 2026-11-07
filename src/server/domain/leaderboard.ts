/** Utilitas periode & skor leaderboard. */

function tzOffsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** Instant UTC untuk tengah malam lokal tanggal (year, month 1-12, day) di timezone tertentu. */
export function zonedMidnight(year: number, month: number, day: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day);
  const offset = tzOffsetMs(new Date(guess), timeZone);
  const result = new Date(guess - offset);
  // Koreksi bila offset berubah (DST) di sekitar tengah malam.
  const offset2 = tzOffsetMs(result, timeZone);
  return offset2 === offset ? result : new Date(guess - offset2);
}

export type MonthKey = { year: number; month: number };

export function currentMonth(timeZone: string, now: Date = new Date()): MonthKey {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "numeric" }).formatToParts(now);
  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
  };
}

export function parseMonthKey(raw: string | undefined): MonthKey | null {
  if (!raw) return null;
  const m = /^(\d{4})-(\d{2})$/.exec(raw);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12 || year < 2000 || year > 2100) return null;
  return { year, month };
}

export function formatMonthKey({ year, month }: MonthKey): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Rentang [start, end) bulan dalam timezone aplikasi, sebagai instant UTC. */
export function monthRange({ year, month }: MonthKey, timeZone: string): { start: Date; end: Date } {
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  return {
    start: zonedMidnight(year, month, 1, timeZone),
    end: zonedMidnight(next.year, next.month, 1, timeZone),
  };
}

export type OwnedCharacter = { characterId: string; rarity: number; quantity: number; firstObtainedAt: Date };

/** Lifetime: SUM(rarity) karakter unik dengan quantity > 0. Duplikat tidak dihitung. */
export function lifetimeStars(items: readonly OwnedCharacter[]): number {
  const seen = new Map<string, number>();
  for (const i of items) if (i.quantity > 0) seen.set(i.characterId, i.rarity);
  return [...seen.values()].reduce((s, r) => s + r, 0);
}

/** Bulanan: SUM(rarity) karakter unik yang PERTAMA kali diperoleh dalam rentang [start, end). */
export function monthlyStars(items: readonly OwnedCharacter[], range: { start: Date; end: Date }): number {
  const seen = new Map<string, number>();
  for (const i of items) {
    if (i.quantity > 0 && i.firstObtainedAt >= range.start && i.firstObtainedAt < range.end) {
      seen.set(i.characterId, i.rarity);
    }
  }
  return [...seen.values()].reduce((s, r) => s + r, 0);
}

export type LeaderboardRow = {
  userId: string;
  username: string;
  score: number;
  solvedCount: number;
  reachedAt: Date | null;
};

/** Urutan: skor desc → soal solved desc → waktu skor tercapai asc → username asc. */
export function compareLeaderboard(a: LeaderboardRow, b: LeaderboardRow): number {
  if (b.score !== a.score) return b.score - a.score;
  if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
  const ta = a.reachedAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const tb = b.reachedAt?.getTime() ?? Number.POSITIVE_INFINITY;
  if (ta !== tb) return ta - tb;
  return a.username.localeCompare(b.username);
}

export function rankRows<T extends LeaderboardRow>(rows: readonly T[]): (T & { rank: number })[] {
  return [...rows].sort(compareLeaderboard).map((r, i) => ({ ...r, rank: i + 1 }));
}
