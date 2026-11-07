import Link from "next/link";
import { ArrowRight, BookOpen, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Progress } from "@/components/ui/misc";
import { CoinAmount, ShardAmount } from "@/components/shared/currency";
import { CharacterTile } from "@/components/shared/rarity";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { requireStudentPage } from "@/lib/auth/current-user";
import { getWallet } from "@/server/services/wallet.service";
import { getLearningSummary } from "@/server/services/learning.service";
import { listBannersForStudent } from "@/server/services/gacha.service";
import { listInventory, totalStars } from "@/server/services/collection.service";
import { leaderboard, myRank } from "@/server/services/leaderboard.service";
import { AVAILABILITY_LABEL } from "@/server/domain/banner";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireStudentPage();
  const [wallet, learning, banners, inventory, stars, top, rank] = await Promise.all([
    getWallet(user.id),
    getLearningSummary(user.id),
    listBannersForStudent(),
    listInventory(user.id),
    totalStars(user.id),
    leaderboard("lifetime", undefined, 5),
    myRank(user.id, "lifetime"),
  ]);
  const activeBanners = banners.filter((b) => b.availability === "ACTIVE");
  const recent = [...inventory].sort((a, b) => +b.firstObtainedAt - +a.firstObtainedAt).slice(0, 4);
  const overall = learning.publishedCount
    ? Math.round((learning.solvedCount / learning.publishedCount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black sm:text-3xl">Halo, {user.username}! 👋</h1>
        <p className="text-muted-foreground">Siap belajar dan menambah koleksi hari ini?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Koin</CardDescription>
          </CardHeader>
          <CardContent>
            <CoinAmount value={wallet.coins} className="text-2xl" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Shard</CardDescription>
          </CardHeader>
          <CardContent>
            <ShardAmount value={wallet.shards} className="text-2xl" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Total bintang</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-black text-amber-600">
            {stars} ★{" "}
            {rank && (
              <span className="text-muted-foreground text-sm font-semibold">
                · peringkat #{rank.rank}
              </span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription>Soal selesai</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-black">
              {learning.solvedCount}
              <span className="text-muted-foreground text-sm font-semibold">
                {" "}
                / {learning.publishedCount}
              </span>
            </p>
            <Progress value={overall} label="Progress belajar keseluruhan" />
            {learning.pendingCount > 0 && (
              <Badge variant="warning">{learning.pendingCount} menunggu review</Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="text-primary size-5" aria-hidden /> Lanjutkan belajar
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/learn">
                Semua paket <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {learning.inProgress.length === 0 ? (
              <EmptyState
                title="Belum ada paket yang dikerjakan"
                description="Pilih paket soal untuk mulai mengumpulkan koin."
                action={
                  <Button asChild>
                    <Link href="/learn">Pilih paket</Link>
                  </Button>
                }
              />
            ) : (
              learning.inProgress.map((p) => (
                <Link
                  key={p.packageId}
                  href={`/packages/${p.packageId}`}
                  className="hover:bg-muted/50 block rounded-lg border p-4"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="font-semibold">{p.title}</p>
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Clock className="size-3" aria-hidden /> {formatDate(p.lastActivityAt)}
                    </span>
                  </div>
                  <Progress value={p.progress.percent} label={`Progress ${p.title}`} />
                  <p className="text-muted-foreground mt-1 text-xs">
                    {p.progress.solved}/{p.progress.total} soal selesai
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="text-primary size-5" aria-hidden /> Banner aktif
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeBanners.length === 0 ? (
              <p className="text-muted-foreground text-sm">Belum ada banner aktif.</p>
            ) : (
              activeBanners.map((b) => (
                <Link
                  key={b.id}
                  href={`/gacha/${b.id}`}
                  className="from-primary/5 hover:border-primary block rounded-lg border bg-gradient-to-br to-fuchsia-500/10 p-4"
                >
                  <p className="font-semibold">{b.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge>{b.type === "LIMITED" ? "Limited" : "Permanen"}</Badge>
                    <Badge variant="success">{AVAILABILITY_LABEL[b.availability]}</Badge>
                    {b.stepUpEnabled && <Badge variant="warning">Step-Up</Badge>}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Karakter terbaru</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/collection">
                Koleksi <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState
                title="Koleksimu masih kosong"
                description="Kumpulkan koin lalu coba gacha pertamamu!"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {recent.map((i) => (
                  <CharacterTile key={i.id} character={i.character} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Leaderboard</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/leaderboard">Lihat</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <LeaderboardTable entries={top.entries} compact highlight={user.username} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
