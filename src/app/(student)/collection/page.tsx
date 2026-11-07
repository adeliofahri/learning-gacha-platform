import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { CharacterTile } from "@/components/shared/rarity";
import { ShardAmount } from "@/components/shared/currency";
import { requireStudentPage } from "@/lib/auth/current-user";
import { listInventory, totalStars } from "@/server/services/collection.service";
import { firstParam } from "@/lib/utils";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Koleksi" };

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireStudentPage();
  const raw = Number(firstParam((await searchParams).rarity));
  const rarity = Number.isInteger(raw) && raw >= 1 && raw <= 6 ? raw : undefined;
  const [items, stars] = await Promise.all([
    listInventory(user.id, { rarity }),
    totalStars(user.id),
  ]);
  const shardTotal = items.reduce((s, i) => s + i.shardsFromDuplicates, 0);

  return (
    <div>
      <PageHeader
        title="Koleksi karakter"
        description={`Total ${stars} ★ dari karakter unik. Duplikat otomatis dikonversi menjadi shard.`}
      />
      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Filter rarity">
        {[undefined, 6, 5, 4, 3, 2, 1].map((r) => (
          <Link
            key={r ?? "all"}
            href={r ? `/collection?rarity=${r}` : "/collection"}
            aria-current={rarity === r ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-semibold",
              rarity === r
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:bg-muted",
            )}
          >
            {r ? `${r}★` : "Semua"}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <EmptyState
          title={rarity ? `Belum punya karakter ${rarity}★` : "Koleksimu masih kosong"}
          description="Dapatkan karakter melalui gacha menggunakan koin dari mengerjakan soal."
        />
      ) : (
        <>
          {rarity === undefined && (
            <p className="text-muted-foreground mb-3 text-sm">
              {items.length} karakter unik · shard dari duplikat: <ShardAmount value={shardTotal} />
            </p>
          )}
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
            data-testid="collection-grid"
          >
            {items.map((i) => (
              <Link
                key={i.id}
                href={`/collection/${i.characterId}`}
                className="rounded-lg focus-visible:outline-2"
              >
                <CharacterTile
                  character={i.character}
                  className="h-full transition-shadow hover:shadow-md"
                  footer={
                    <div className="flex flex-wrap justify-center gap-1">
                      {i.duplicateCount > 0 && (
                        <Badge variant="secondary">+{i.duplicateCount} duplikat</Badge>
                      )}
                      {i.character.status === "ARCHIVED" && (
                        <Badge variant="outline">Diarsipkan</Badge>
                      )}
                    </div>
                  }
                />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
