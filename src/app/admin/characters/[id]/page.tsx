import { notFound } from "next/navigation";
import { Alert, PageHeader } from "@/components/ui/misc";
import { CharacterForm } from "@/components/admin/character-form";
import { prisma } from "@/lib/db";
import { libraryImages } from "@/server/services/upload.service";
import { CharacterDeleteButton } from "@/components/admin/character-delete-button";
import { getCharacterDeletePreview } from "@/server/services/collection.service";

export const metadata = { title: "Edit karakter" };

export default async function EditCharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await prisma.character.findUnique({
    where: { id },
    include: { _count: { select: { inventory: true } } },
  });
  if (!c) notFound();

  const deletePreview = await getCharacterDeletePreview(id);
  
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={`Edit ${c.name}`} />
        <CharacterDeleteButton preview={deletePreview} />
      </div>

      {c._count.inventory > 0 && (
        <Alert variant="info" className="mb-4">
          Dimiliki {c._count.inventory} siswa. Rarity terkunci agar skor
          leaderboard tetap konsisten. Mengarsipkan karakter tidak
          menghapusnya dari koleksi siswa.
        </Alert>
      )}

      <CharacterForm
        library={await libraryImages()}
        lockRarity={c._count.inventory > 0}
        initial={{
          id: c.id,
          name: c.name,
          description: c.description,
          rarity: c.rarity,
          imageUrl: c.imageUrl,
          category: c.category,
          status: c.status,
        }}
      />
    </div>
  );
}
