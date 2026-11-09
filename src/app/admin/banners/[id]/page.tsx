import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Alert, PageHeader } from "@/components/ui/misc";
import { BannerForm } from "@/components/admin/banner-form";
import { BannerStatusActions } from "@/components/admin/banner-status-actions";
import { prisma } from "@/lib/db";
import {
  AVAILABILITY_LABEL,
  bannerAvailability,
  validateBannerForPublish,
} from "@/server/domain/banner";

export const metadata = { title: "Edit banner" };

const toLocal = (d: Date | null) =>
  d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";

export default async function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [b, characters] = await Promise.all([
    prisma.banner.findUnique({
      where: { id },
      include: {
        entries: { include: { character: true } },
        stepUpStages: { orderBy: { stage: "asc" } },
        _count: { select: { pulls: true } },
      },
    }),
    prisma.character.findMany({ orderBy: [{ rarity: "desc" }, { name: "asc" }] }),
  ]);
  if (!b) notFound();
  const availability = bannerAvailability(b);
  const errors = validateBannerForPublish({
    ...b,
    entries: b.entries.map((e) => ({
      rarity: e.character.rarity,
      weight: e.weight,
      isFeatured: e.isFeatured,
      characterActive: e.character.status === "ACTIVE",
      category: e.character.category,
    })),
    stages: b.stepUpStages,
  });
  return (
    <div>
      <PageHeader
        title={b.name}
        description={`${b._count.pulls} pull tercatat`}
        actions={
          <BannerStatusActions bannerId={b.id} status={b.status} canPublish={errors.length === 0} />
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant={availability === "ACTIVE" ? "success" : "secondary"}>
          {AVAILABILITY_LABEL[availability]}
        </Badge>
        {b.isDemoRate && <Badge variant="outline">DEMO RATE — tinjau sebelum production</Badge>}
      </div>
      {errors.length > 0 && (
        <Alert variant="warning" className="mb-4" title="Belum valid untuk dipublikasikan">
          <ul className="list-disc pl-4">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Alert>
      )}
      {b.status === "ARCHIVED" ? (
        <Alert variant="info">
          Banner diarsipkan dan tidak dapat diubah. Histori pull tetap tersimpan.
        </Alert>
      ) : (
        <BannerForm
          characters={characters.map((c) => ({
            id: c.id,
            name: c.name,
            rarity: c.rarity,
            imageUrl: c.imageUrl,
            status: c.status,
          }))}
          initial={{
            id: b.id,
            name: b.name,
            description: b.description,
            type: b.type,
            startsAt: toLocal(b.startsAt),
            endsAt: toLocal(b.endsAt),
            singlePrice: b.singlePrice,
            stepUpEnabled: b.stepUpEnabled,
            stepUpGuaranteeFeatured: b.stepUpGuaranteeFeatured,
            isDemoRate: b.isDemoRate,
            entries: b.entries.map((e) => ({
              characterId: e.characterId,
              weight: e.weight,
              isFeatured: e.isFeatured,
            })),
            stages: b.stepUpStages.length
              ? b.stepUpStages.map((s) => ({ price: s.price, pullCount: s.pullCount }))
              : undefined,
          }}
        />
      )}
    </div>
  );
}
