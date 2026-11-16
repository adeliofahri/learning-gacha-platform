import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requireAdminPage } from "@/lib/auth/current-user";
import { listPendingContributions } from "@/server/services/contribution.service";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review kontribusi" };

export default async function AdminContributionsPage() {
  await requireAdminPage();
  const { items, total } = await listPendingContributions(1, 100);
  return (
    <div className="space-y-6">
      <PageHeader title="Pending Request" description={`${total} kontribusi menunggu pemeriksaan admin.`} />
      {items.length === 0 ? (
        <EmptyState title="Tidak ada kontribusi menunggu" description="Kontribusi baru akan muncul di sini." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const content = item.content as Record<string, unknown>;
            const title = String(content.title ?? content.name ?? "Tanpa judul");
            return (
              <Link key={item.id} href={`/admin/contributions/${item.id}`} className="block">
                <Card className="transition-colors hover:border-primary">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{item.type === "QUESTION" ? "Soal" : "Karakter"}</Badge>
                        <span className="font-semibold">{title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Oleh {item.user.username} · {formatDateTime(item.createdAt)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary">Periksa kontribusi →</span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
