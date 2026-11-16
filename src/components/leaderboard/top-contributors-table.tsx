import Link from "next/link";
import { Trophy } from "lucide-react";
import { Avatar } from "@/components/shared/rarity";
import { EmptyState } from "@/components/ui/misc";
import type { ContributorLeaderboardEntry } from "@/server/repositories/leaderboard.repository";
import { cn } from "@/lib/utils/cn";

const MEDAL = [
  "text-amber-500",
  "text-slate-400",
  "text-orange-500",
];

export function TopContributorsTable({
  entries,
  highlight,
}: {
  entries: ContributorLeaderboardEntry[];
  highlight?: string;
}) {
  if (entries.length === 0) {
    return (
      <EmptyState
        title="Belum ada kontributor"
        description="Selesaikan dan ajukan kontribusi untuk mulai mengumpulkan Contribution Points."
      />
    );
  }

  return (
    <ol className="bg-card divide-y rounded-lg border" aria-label="Top contributors">
      {entries.map((entry) => (
        <li
          key={entry.username}
          className={cn(
            "flex items-center gap-3 px-4 py-3",
            entry.username === highlight && "bg-primary/5",
          )}
        >
          <span className="w-8 text-center font-black tabular-nums">
            {entry.rank <= 3 ? (
              <Trophy
                className={cn(
                  "mx-auto size-5",
                  MEDAL[entry.rank - 1],
                )}
                aria-label={`Peringkat ${entry.rank}`}
              />
            ) : (
              entry.rank
            )}
          </span>

          <Avatar
            src={entry.avatarUrl}
            name={entry.username}
            size={40}
          />

          <Link
            href={`/students/${entry.username}`}
            className="hover:text-primary min-w-0 flex-1 truncate font-semibold hover:underline"
          >
            {entry.username}
          </Link>

          <span
            className="font-black text-primary tabular-nums"
            aria-label={`${entry.contributionPoints} contribution points`}
          >
            {entry.contributionPoints} Points
          </span>
        </li>
      ))}
    </ol>
  );
}