import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PageHeader, Pagination, Table, Td, Th } from "@/components/ui/misc";
import { CharacterImage } from "@/components/shared/rarity";
import { requireStudentPage } from "@/lib/auth/current-user";
import { listPullHistory } from "@/server/services/gacha.service";
import { PULL_TYPE_LABEL } from "@/lib/constants";
import { clampPage, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Riwayat gacha" };
const PAGE_SIZE = 15;

export default async function GachaHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireStudentPage();
  const page = clampPage((await searchParams).page);
  const { items, total } = await listPullHistory(user.id, page, PAGE_SIZE);
  return (
    <div>
      <Link
        href="/gacha"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1 text-sm font-semibold"
      >
        <ArrowLeft className="size-4" aria-hidden /> Gacha
      </Link>
      <PageHeader
        title="Riwayat gacha"
        description="Semua pull tersimpan permanen, termasuk dari banner yang sudah berakhir."
      />
      {items.length === 0 ? (
        <EmptyState title="Belum ada riwayat" description="Hasil pull kamu akan muncul di sini." />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Waktu</Th>
              <Th>Banner</Th>
              <Th>Jenis</Th>
              <Th>Harga</Th>
              <Th>Hasil</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <Td className="whitespace-nowrap">{formatDateTime(p.createdAt)}</Td>
                <Td>{p.banner.name}</Td>
                <Td>
                  <Badge variant="secondary">
                    {PULL_TYPE_LABEL[p.pullType]}
                    {p.stepNumber ? ` ${p.stepNumber}` : ""}
                  </Badge>
                </Td>
                <Td className="tabular-nums">{p.price}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {p.results.map((r) => (
                      <span
                        key={r.id}
                        title={`${r.character.name} (${r.rarity}★)${r.isNew ? " — baru" : ` — duplikat +${r.shardsAwarded} shard`}`}
                      >
                        <CharacterImage
                          src={r.character.imageUrl}
                          name={`${r.character.name} ${r.rarity}★`}
                          size={32}
                        />
                      </span>
                    ))}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} baseHref="/gacha/history" />
    </div>
  );
}
