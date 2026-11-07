import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { prisma } from "@/lib/db";
import { AVAILABILITY_LABEL, bannerAvailability } from "@/server/domain/banner";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Banner gacha" };

export default async function AdminBannersPage() {
  const banners = await prisma.banner.findMany({
    include: { _count: { select: { entries: true, pulls: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div>
      <PageHeader
        title="Banner gacha"
        description="Banner baru dibuat sebagai draft dan harus lolos validasi sebelum dipublikasikan. Banner tidak pernah dihapus agar histori tetap ada."
        actions={
          <Button asChild>
            <Link href="/admin/banners/new">
              <Plus /> Banner baru
            </Link>
          </Button>
        }
      />
      {banners.length === 0 ? (
        <EmptyState title="Belum ada banner" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Nama</Th>
              <Th>Tipe</Th>
              <Th>Status</Th>
              <Th>Periode</Th>
              <Th className="text-right">Karakter</Th>
              <Th className="text-right">Pull</Th>
            </tr>
          </thead>
          <tbody>
            {banners.map((b) => {
              const a = bannerAvailability(b);
              return (
                <tr key={b.id}>
                  <Td>
                    <Link
                      href={`/admin/banners/${b.id}`}
                      className="text-primary font-semibold hover:underline"
                    >
                      {b.name}
                    </Link>
                    <div className="mt-1 flex gap-1">
                      {b.stepUpEnabled && <Badge variant="warning">Step-Up</Badge>}
                      {b.isDemoRate && <Badge variant="outline">DEMO RATE</Badge>}
                    </div>
                  </Td>
                  <Td>{b.type === "LIMITED" ? "Limited" : "Permanen"}</Td>
                  <Td>
                    <Badge variant={a === "ACTIVE" ? "success" : "secondary"}>
                      {AVAILABILITY_LABEL[a]}
                    </Badge>
                  </Td>
                  <Td className="text-xs">
                    {b.startsAt ? formatDateTime(b.startsAt) : "—"} →{" "}
                    {b.endsAt ? formatDateTime(b.endsAt) : "tanpa akhir"}
                  </Td>
                  <Td className="text-right">{b._count.entries}</Td>
                  <Td className="text-right">{b._count.pulls}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
