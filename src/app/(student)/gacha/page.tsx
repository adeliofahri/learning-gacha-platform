import Link from "next/link";
import { History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { CharacterImage } from "@/components/shared/rarity";
import { CoinAmount } from "@/components/shared/currency";
import { requireStudentPage } from "@/lib/auth/current-user";
import { listBannersForStudent } from "@/server/services/gacha.service";
import { AVAILABILITY_LABEL } from "@/server/domain/banner";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Gacha" };

export default async function GachaPage() {
  await requireStudentPage();
  const banners = await listBannersForStudent();
  return (
    <div>
      <PageHeader
        title="Gacha"
        description="Gunakan koin virtual hasil belajar. Peluang setiap karakter ditampilkan di halaman banner sebelum kamu melakukan pull."
        actions={
          <Button asChild variant="outline">
            <Link href="/gacha/history">
              <History /> Riwayat gacha
            </Link>
          </Button>
        }
      />
      {banners.length === 0 ? (
        <EmptyState title="Belum ada banner" description="Admin belum membuka banner gacha." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {banners.map((b) => {
            const featured = b.entries.filter((e) => e.isFeatured).slice(0, 3);
            const showcase = featured.length ? featured : b.entries.slice(0, 3);
            const active = b.availability === "ACTIVE";
            return (
              <Card
                key={b.id}
                className={cn("overflow-hidden", !active && "opacity-70")}
                data-testid="banner-card"
              >
                <div className="from-primary/15 flex gap-2 bg-gradient-to-br via-fuchsia-400/15 to-amber-300/20 p-4">
                  {showcase.map((e) => (
                    <CharacterImage
                      key={e.id}
                      src={e.character.imageUrl}
                      name={e.character.name}
                      size={80}
                    />
                  ))}
                </div>
                <CardHeader>
                  <div className="flex flex-wrap gap-1">
                    <Badge>{b.type === "LIMITED" ? "Limited" : "Permanen"}</Badge>
                    <Badge variant={active ? "success" : "secondary"}>
                      {AVAILABILITY_LABEL[b.availability]}
                    </Badge>
                    {b.stepUpEnabled && <Badge variant="warning">Step-Up 5 tahap</Badge>}
                    {b.isDemoRate && <Badge variant="outline">DEMO RATE</Badge>}
                  </div>
                  <CardTitle>{b.name}</CardTitle>
                  <CardDescription>{b.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    <p>
                      Single <CoinAmount value={b.singlePrice} /> · 10×{" "}
                      <CoinAmount value={b.tenPullPrice} />
                    </p>
                    {b.endsAt && (
                      <p className="text-muted-foreground text-xs">
                        Berakhir: {formatDateTime(b.endsAt)}
                      </p>
                    )}
                  </div>
                  <Button asChild variant={active ? "default" : "outline"}>
                    <Link href={`/gacha/${b.id}`}>{active ? "Buka banner" : "Lihat detail"}</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
