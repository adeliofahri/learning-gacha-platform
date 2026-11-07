import { PageHeader } from "@/components/ui/misc";
import { BannerForm } from "@/components/admin/banner-form";
import { prisma } from "@/lib/db";

export const metadata = { title: "Banner baru" };

export default async function NewBannerPage() {
  const characters = await prisma.character.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ rarity: "desc" }, { name: "asc" }],
  });
  return (
    <div>
      <PageHeader
        title="Banner baru"
        description="Disimpan sebagai draft. Tinjau peluang di preview sebelum publish."
      />
      <BannerForm
        characters={characters.map((c) => ({
          id: c.id,
          name: c.name,
          rarity: c.rarity,
          imageUrl: c.imageUrl,
          status: c.status,
        }))}
      />
    </div>
  );
}
