import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { LinkTabs } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/misc";
import { leaderboard } from "@/server/services/leaderboard.service";
import { appTimezone } from "@/lib/env";
import { firstParam } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata = { title: "Leaderboard" };
export const dynamic = "force-dynamic";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const data = await leaderboard(firstParam(sp.period), firstParam(sp.month), 100);
  const user = await getCurrentUser();
  const [y, m] = data.month.split("-").map(Number);
  const monthLabel = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y!, m! - 1, 1)));
  const prev = m === 1 ? `${y! - 1}-12` : `${y}-${String(m! - 1).padStart(2, "0")}`;
  const next = m === 12 ? `${y! + 1}-01` : `${y}-${String(m! + 1).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        title="Leaderboard"
        description="Skor = jumlah bintang karakter unik. Duplikat tidak menambah skor. Seri ditentukan oleh jumlah soal yang diselesaikan, lalu siapa yang lebih dulu mencapai skor tersebut."
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <LinkTabs
          active={data.period}
          items={[
            { key: "lifetime", label: "Sepanjang masa", href: "/leaderboard?period=lifetime" },
            {
              key: "monthly",
              label: "Bulanan",
              href: `/leaderboard?period=monthly&month=${data.month}`,
            },
          ]}
        />
        {data.period === "monthly" && (
          <div className="flex items-center gap-2 text-sm">
            <a
              className="bg-card hover:bg-muted rounded-md border px-2 py-1"
              href={`/leaderboard?period=monthly&month=${prev}`}
              aria-label="Bulan sebelumnya"
            >
              ‹
            </a>
            <span className="font-semibold">{monthLabel}</span>
            <a
              className="bg-card hover:bg-muted rounded-md border px-2 py-1"
              href={`/leaderboard?period=monthly&month=${next}`}
              aria-label="Bulan berikutnya"
            >
              ›
            </a>
          </div>
        )}
      </div>
      {data.period === "monthly" && (
        <p className="text-muted-foreground mb-3 text-xs">
          Bulanan menghitung karakter unik yang pertama kali diperoleh pada bulan tersebut (zona
          waktu {appTimezone()}).
        </p>
      )}
      <LeaderboardTable entries={data.entries} highlight={user?.username} />
    </div>
  );
}
