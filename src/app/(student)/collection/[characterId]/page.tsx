import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/misc";
import { CharacterImage, RarityStars } from "@/components/shared/rarity";
import { ShardAmount } from "@/components/shared/currency";
import { requireStudentPage } from "@/lib/auth/current-user";
import { getInventoryItem } from "@/server/services/collection.service";
import { AppError } from "@/lib/errors";
import { formatDateTime } from "@/lib/utils";
import { PULL_TYPE_LABEL } from "@/lib/constants";

export const metadata = { title: "Detail karakter" };

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ characterId: string }>;
}) {
  const user = await requireStudentPage();
  const { characterId } = await params;
  let data;
  try {
    data = await getInventoryItem(user.id, characterId);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  const { item, history } = data;
  const c = item.character;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/collection"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm font-semibold"
      >
        <ArrowLeft className="size-4" aria-hidden /> Koleksi
      </Link>
      <Card>
        <CardContent className="flex flex-col gap-6 p-6 sm:flex-row">
          <CharacterImage src={c.imageUrl} name={c.name} size={200} className="mx-auto shadow-lg" />
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1">
              <Badge>{c.category === "LIMITED" ? "Limited" : "Permanen"}</Badge>
              {c.status === "ARCHIVED" && <Badge variant="outline">Diarsipkan</Badge>}
            </div>
            <h1 className="text-2xl font-black">{c.name}</h1>
            <RarityStars rarity={c.rarity} />
            <p className="text-muted-foreground">{c.description}</p>
            <dl className="grid grid-cols-2 gap-2 pt-2 text-sm">
              <dt className="text-muted-foreground">Pertama didapat</dt>
              <dd>{formatDateTime(item.firstObtainedAt)}</dd>
              <dt className="text-muted-foreground">Terakhir didapat</dt>
              <dd>{formatDateTime(item.lastObtainedAt)}</dd>
              <dt className="text-muted-foreground">Jumlah duplikat</dt>
              <dd>{item.duplicateCount}</dd>
              <dt className="text-muted-foreground">Shard dari duplikat</dt>
              <dd>
                <ShardAmount value={item.shardsFromDuplicates} />
              </dd>
            </dl>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Riwayat perolehan</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Karakter ini diberikan sebagai data awal (bukan dari gacha).
            </p>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Waktu</Th>
                  <Th>Banner</Th>
                  <Th>Jenis</Th>
                  <Th>Hasil</Th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <Td>{formatDateTime(h.createdAt)}</Td>
                    <Td>{h.pull.banner.name}</Td>
                    <Td>{PULL_TYPE_LABEL[h.pull.pullType]}</Td>
                    <Td>
                      {h.isNew ? (
                        <Badge variant="success">Baru</Badge>
                      ) : (
                        <ShardAmount value={h.shardsAwarded} />
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
