import Link from "next/link";
import { Trophy } from "lucide-react";
import { Avatar } from "@/components/shared/rarity";
import { EmptyState } from "@/components/ui/misc";
import type { LeaderboardEntry } from "@/server/repositories/leaderboard.repository";
import { cn } from "@/lib/utils/cn";

const MEDAL = ["text-amber-500", "text-slate-400", "text-orange-500"];

/** Hanya menampilkan username, avatar, dan skor (tanpa data pribadi). */
export function LeaderboardTable({
  entries,
  compact = false,
  highlight,
}: {
  entries: LeaderboardEntry[];
  compact?: boolean;
  highlight?: string;
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="Leaderboard masih kosong"
        description="Kumpulkan karakter lewat gacha untuk masuk ke papan peringkat."
      />
    );
  }
  return (
    <ol className="bg-card divide-y rounded-lg border" aria-label="Peringkat">
      {entries.map((e) => (
        <li
          key={e.username}
          className={cn(
            "flex items-center gap-3 px-4",
            compact ? "py-2" : "py-3",
            e.username === highlight && "bg-primary/5",
          )}
        >
          <span className="w-8 text-center font-black tabular-nums">
            {e.rank <= 3 ? (
              <Trophy
                className={cn("mx-auto size-5", MEDAL[e.rank - 1])}
                aria-label={`Peringkat ${e.rank}`}
              />
            ) : (
              e.rank
            )}
          </span>
          <Avatar src={e.avatarUrl} name={e.username} size={compact ? 32 : 40} />
          <Link
            href={`/students/${e.username}`}
            className="hover:text-primary min-w-0 flex-1 truncate font-semibold hover:underline"
          >
            {e.username}
          </Link>
          <span
            className="font-black text-amber-600 tabular-nums"
            aria-label={`${e.score} bintang`}
          >
            {e.score} ★
          </span>
        </li>
      ))}
    </ol>
  );
}
