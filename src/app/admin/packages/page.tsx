import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { prisma } from "@/lib/db";
import { CONTENT_STATUS_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Paket" };

export default async function AdminPackagesPage() {
  const packages = await prisma.package.findMany({
    include: { subject: true, _count: { select: { items: true, progress: true } } },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
  return (
    <div>
      <PageHeader
        title="Manajemen paket"
        actions={
          <Button asChild>
            <Link href="/admin/packages/new">
              <Plus /> Paket baru
            </Link>
          </Button>
        }
      />
      {packages.length === 0 ? (
        <EmptyState title="Belum ada paket" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Judul</Th>
              <Th>Mapel</Th>
              <Th className="text-right">Soal</Th>
              <Th className="text-right">Siswa aktif</Th>
              <Th>Status</Th>
              <Th>Diubah</Th>
            </tr>
          </thead>
          <tbody>
            {packages.map((p) => (
              <tr key={p.id}>
                <Td>
                  <Link
                    className="text-primary font-semibold hover:underline"
                    href={`/admin/packages/${p.id}`}
                  >
                    {p.title}
                  </Link>
                </Td>
                <Td>{p.subject?.name ?? "Campuran"}</Td>
                <Td className="text-right">{p._count.items}</Td>
                <Td className="text-right">{p._count.progress}</Td>
                <Td>
                  <Badge variant={p.status === "PUBLISHED" ? "success" : "secondary"}>
                    {CONTENT_STATUS_LABEL[p.status]}
                  </Badge>
                </Td>
                <Td className="text-xs">{formatDateTime(p.updatedAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
