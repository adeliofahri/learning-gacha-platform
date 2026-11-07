import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { CharacterImage, RarityStars } from "@/components/shared/rarity";
import { prisma } from "@/lib/db";

export const metadata = { title: "Karakter" };

export default async function AdminCharactersPage() {
  const characters = await prisma.character.findMany({
    include: { _count: { select: { inventory: true, bannerItems: true } } },
    orderBy: [{ status: "asc" }, { rarity: "desc" }, { name: "asc" }],
  });
  return (
    <div>
      <PageHeader
        title="Manajemen karakter"
        actions={
          <Button asChild>
            <Link href="/admin/characters/new">
              <Plus /> Karakter baru
            </Link>
          </Button>
        }
      />
      {characters.length === 0 ? (
        <EmptyState title="Belum ada karakter" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Karakter</Th>
              <Th>Rarity</Th>
              <Th>Kategori</Th>
              <Th>Status</Th>
              <Th className="text-right">Dimiliki</Th>
              <Th className="text-right">Banner</Th>
            </tr>
          </thead>
          <tbody>
            {characters.map((c) => (
              <tr key={c.id}>
                <Td>
                  <Link
                    href={`/admin/characters/${c.id}`}
                    className="text-primary flex items-center gap-2 font-semibold hover:underline"
                  >
                    <CharacterImage src={c.imageUrl} name={c.name} size={36} />
                    {c.name}
                  </Link>
                </Td>
                <Td>
                  <RarityStars rarity={c.rarity} />
                </Td>
                <Td>{c.category === "LIMITED" ? "Limited" : "Permanen"}</Td>
                <Td>
                  <Badge variant={c.status === "ACTIVE" ? "success" : "outline"}>
                    {c.status === "ACTIVE" ? "Aktif" : "Diarsipkan"}
                  </Badge>
                </Td>
                <Td className="text-right">{c._count.inventory}</Td>
                <Td className="text-right">{c._count.bannerItems}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
