import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { EventForm } from "@/components/admin/event-form";
import { prisma } from "@/lib/db";

export const metadata = { title: "Edit event" };
const toLocal = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await prisma.event.findUnique({
    where: { id },
    include: { _count: { select: { claims: true } } },
  });
  if (!e) notFound();
  return (
    <div>
      <PageHeader
        title={`Edit: ${e.name}`}
        description={`${e._count.claims} siswa sudah mengklaim.`}
      />
      <Card>
        <CardContent className="pt-5">
          <EventForm
            initial={{
              id: e.id,
              name: e.name,
              description: e.description,
              coinReward: e.coinReward,
              minSolved: e.minSolved,
              maxClaims: e.maxClaims ?? "",
              startsAt: toLocal(e.startsAt),
              endsAt: toLocal(e.endsAt),
              status: e.status,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
