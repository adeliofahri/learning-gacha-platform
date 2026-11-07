import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, Pagination, Table, Td, Th } from "@/components/ui/misc";
import { listAuditLogs } from "@/server/services/admin.service";
import { clampPage, firstParam, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Audit log" };
const PAGE_SIZE = 30;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const action = firstParam(sp.action)?.toUpperCase().slice(0, 50);
  const page = clampPage(sp.page);
  const { items, total } = await listAuditLogs({ action, page, pageSize: PAGE_SIZE });
  return (
    <div>
      <PageHeader title="Audit log" description="Catatan tindakan admin penting." />
      <form method="get" className="mb-4 flex gap-2">
        <Input
          name="action"
          placeholder="Filter aksi, mis. WALLET_ADJUST"
          defaultValue={action}
          aria-label="Filter aksi"
          className="max-w-xs"
        />
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>
      {items.length === 0 ? (
        <EmptyState title="Belum ada log" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Waktu</Th>
              <Th>Admin</Th>
              <Th>Aksi</Th>
              <Th>Target</Th>
              <Th>Metadata</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id}>
                <Td className="text-xs whitespace-nowrap">{formatDateTime(l.createdAt)}</Td>
                <Td>{l.actor?.username ?? "sistem"}</Td>
                <Td>
                  <Badge variant="secondary">{l.action}</Badge>
                </Td>
                <Td className="text-xs">
                  {l.targetType}
                  {l.targetId && <span className="text-muted-foreground block">{l.targetId}</span>}
                </Td>
                <Td>
                  <code className="text-muted-foreground block max-w-md text-xs break-all whitespace-pre-wrap">
                    {l.metadata ? JSON.stringify(l.metadata) : "-"}
                  </code>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        baseHref="/admin/audit"
        params={{ action }}
      />
    </div>
  );
}
