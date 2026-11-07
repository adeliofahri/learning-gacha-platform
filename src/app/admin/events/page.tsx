import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/misc";
import { EventForm } from "@/components/admin/event-form";
import { prisma } from "@/lib/db";
import { isEventOpen } from "@/server/services/event.service";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Event" };

export default async function AdminEventsPage() {
  const events = await prisma.event.findMany({
    include: { _count: { select: { claims: true } } },
    orderBy: { startsAt: "desc" },
  });
  return (
    <div className="space-y-6">
      <PageHeader
        title="Event & bonus koin"
        description="Setiap siswa hanya dapat mengklaim satu kali per event. Kuota global opsional."
      />
      {events.length === 0 ? (
        <EmptyState title="Belum ada event" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Nama</Th>
              <Th>Periode</Th>
              <Th className="text-right">Reward</Th>
              <Th>Aturan</Th>
              <Th className="text-right">Klaim</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <Td>
                  <Link
                    href={`/admin/events/${e.id}`}
                    className="text-primary font-semibold hover:underline"
                  >
                    {e.name}
                  </Link>
                </Td>
                <Td className="text-xs">
                  {formatDateTime(e.startsAt)} → {formatDateTime(e.endsAt)}
                </Td>
                <Td className="text-right">{e.coinReward}</Td>
                <Td className="text-xs">
                  {e.minSolved > 0 ? `min. ${e.minSolved} soal` : "tanpa syarat"}
                  {e.maxClaims !== null && ` · kuota ${e.maxClaims}`}
                </Td>
                <Td className="text-right">{e._count.claims}</Td>
                <Td>
                  {e.status === "ARCHIVED" ? (
                    <Badge variant="outline">Diarsipkan</Badge>
                  ) : isEventOpen(e) ? (
                    <Badge variant="success">Berlangsung</Badge>
                  ) : (
                    <Badge variant="secondary">Di luar periode</Badge>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Buat event baru</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm />
        </CardContent>
      </Card>
    </div>
  );
}
