import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, Pagination, Table, Td, Th } from "@/components/ui/misc";
import { listStudents } from "@/server/services/admin.service";
import { clampPage, firstParam, formatDate } from "@/lib/utils";

export const metadata = { title: "Siswa" };
const PAGE_SIZE = 20;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = firstParam(sp.q)?.slice(0, 50);
  const page = clampPage(sp.page);
  const { items, total } = await listStudents(q, page, PAGE_SIZE);
  return (
    <div>
      <PageHeader
        title="Manajemen siswa"
        description="Data privat (email) hanya terlihat oleh admin."
      />
      <form method="get" className="mb-4 flex gap-2" role="search">
        <Input
          name="q"
          placeholder="Cari username…"
          defaultValue={q}
          aria-label="Cari username"
          className="max-w-xs"
        />
        <Button type="submit" variant="secondary">
          Cari
        </Button>
      </form>
      {items.length === 0 ? (
        <EmptyState title="Tidak ada siswa" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Username</Th>
              <Th>Email</Th>
              <Th>Status</Th>
              <Th className="text-right">Koin</Th>
              <Th className="text-right">Shard</Th>
              <Th className="text-right">Solved</Th>
              <Th className="text-right">Karakter</Th>
              <Th>Terdaftar</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id}>
                <Td>
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="text-primary font-semibold hover:underline"
                  >
                    {u.username}
                  </Link>
                </Td>
                <Td className="text-muted-foreground">{u.email}</Td>
                <Td>
                  <Badge variant={u.status === "ACTIVE" ? "success" : "destructive"}>
                    {u.status === "ACTIVE" ? "Aktif" : "Ditangguhkan"}
                  </Badge>
                </Td>
                <Td className="text-right tabular-nums">{u.wallet?.coins ?? 0}</Td>
                <Td className="text-right tabular-nums">{u.wallet?.shards ?? 0}</Td>
                <Td className="text-right">{u._count.solves}</Td>
                <Td className="text-right">{u._count.inventory}</Td>
                <Td className="text-xs">{formatDate(u.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        baseHref="/admin/users"
        params={{ q }}
      />
    </div>
  );
}
