import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, Table, Td, Th } from "@/components/ui/misc";
import { CharacterImage, RarityStars } from "@/components/shared/rarity";
import { PullPanel } from "@/components/gacha/pull-panel";
import { requireStudentPage } from "@/lib/auth/current-user";
import { getBannerDetail } from "@/server/services/gacha.service";
import { getWallet } from "@/server/services/wallet.service";
import { AVAILABILITY_LABEL } from "@/server/domain/banner";
import { formatRate } from "@/server/domain/gacha";
import { AppError } from "@/lib/errors";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Banner" };

export default async function BannerPage({ params }: { params: Promise<{ bannerId: string }> }) {
  const user = await requireStudentPage();
  const { bannerId } = await params;
  let banner;
  try {
    banner = await getBannerDetail(bannerId, user.id);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const wallet = await getWallet(user.id);
  const rateById = new Map(banner.rates.perCharacter.map((r) => [r.characterId, r.rate]));
  const active = banner.availability === "ACTIVE";

  return (
    <div className="space-y-6">
      <Link
        href="/gacha"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm font-semibold"
      >
        <ArrowLeft className="size-4" aria-hidden /> Semua banner
      </Link>
      <div className="overflow-hidden rounded-lg border">
        {banner.imageUrl && (
          <img
            src={banner.imageUrl}
            alt={`Artwork ${banner.name}`}
            className="aspect-video w-full object-cover"
          />
        )}
        <div className="from-primary/10 rounded-lg border bg-gradient-to-br via-fuchsia-400/10 to-amber-300/15 p-5">
          <div className="flex flex-wrap gap-1">
            <Badge>{banner.type === "LIMITED" ? "Limited" : "Permanen"}</Badge>
            <Badge variant={active ? "success" : "secondary"}>
              {AVAILABILITY_LABEL[banner.availability]}
            </Badge>
            {banner.isDemoRate && <Badge variant="outline">DEMO RATE</Badge>}
          </div>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">{banner.name}</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">{banner.description}</p>
          {banner.startsAt && banner.endsAt && (
            <p className="mt-2 text-sm">
              Periode: {formatDateTime(banner.startsAt)} — {formatDateTime(banner.endsAt)}
            </p>
          )}
        </div>
      </div>

      {!active && (
        <Alert
          variant="warning"
          title={banner.availability === "ENDED" ? "Banner sudah berakhir" : "Banner tidak aktif"}
        >
          Pull baru tidak tersedia. Histori dan karakter yang sudah kamu dapatkan tetap tersimpan.
          {banner.stepUp &&
            banner.availability === "ENDED" &&
            " Siklus step-up pada banner ini telah berakhir."}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6 lg:order-2">
          <PullPanel
            bannerId={banner.id}
            active={active}
            coins={wallet.coins}
            singlePrice={banner.singlePrice}
            tenPullPrice={banner.tenPullPrice}
            stepUp={
              banner.stepUp
                ? {
                    currentStage: banner.stepUp.currentStage,
                    cyclesCompleted: banner.stepUp.cyclesCompleted,
                    stages: banner.stepUpStages.map((s) => ({
                      stage: s.stage,
                      price: s.price,
                      pullCount: s.pullCount,
                    })),
                    guaranteeFeatured: banner.stepUpGuaranteeFeatured,
                  }
                : null
            }
          />
        </div>

        <Card className="lg:order-1">
          <CardHeader>
            <CardTitle>Rate disclosure</CardTitle>
            <p className="text-muted-foreground text-sm">
              Peluang dihitung dari bobot (weight) setiap karakter dan berlaku untuk setiap hasil.
              {banner.isDemoRate &&
                " Rate ini adalah konfigurasi DEMO dan perlu ditinjau admin sebelum production."}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2" aria-label="Peluang per rarity">
              {banner.rates.perRarity.map((r) => (
                <span key={r.rarity} className="bg-card rounded-md border px-3 py-1.5 text-sm">
                  <RarityStars rarity={r.rarity} />{" "}
                  <b className="ml-1 tabular-nums">{formatRate(r.rate)}</b>
                </span>
              ))}
            </div>
            <Table>
              <thead>
                <tr>
                  <Th>Karakter</Th>
                  <Th>Rarity</Th>
                  <Th className="text-right">Peluang</Th>
                </tr>
              </thead>
              <tbody>
                {banner.entries
                  .filter((e) => e.character.status === "ACTIVE")
                  .map((e) => (
                    <tr key={e.id}>
                      <Td>
                        <div className="flex items-center gap-2">
                          <CharacterImage
                            src={e.character.imageUrl}
                            name={e.character.name}
                            size={32}
                          />
                          <span className="font-medium">{e.character.name}</span>
                          {e.isFeatured && <Badge variant="warning">Featured</Badge>}
                        </div>
                      </Td>
                      <Td>
                        <RarityStars rarity={e.character.rarity} />
                      </Td>
                      <Td className="text-right tabular-nums">
                        {formatRate(rateById.get(e.characterId) ?? 0)}
                      </Td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
