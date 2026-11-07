import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { CoinAmount } from "@/components/shared/currency";
import { ClaimButton } from "@/components/shared/claim-button";
import { requireStudentPage } from "@/lib/auth/current-user";
import { listEventsForStudent } from "@/server/services/event.service";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Event" };

export default async function EventsPage() {
  const user = await requireStudentPage();
  const events = await listEventsForStudent(user.id);
  return (
    <div>
      <PageHeader
        title="Event & bonus"
        description="Klaim bonus koin dari event yang sedang berlangsung. Setiap bonus hanya bisa diklaim sekali."
      />
      {events.length === 0 ? (
        <EmptyState
          title="Tidak ada event aktif"
          description="Pantau terus halaman ini untuk bonus berikutnya."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {events.map((e) => (
            <Card key={e.id}>
              <CardHeader>
                <div className="flex flex-wrap gap-1">
                  {e.claimedAt ? (
                    <Badge variant="success">Sudah diklaim</Badge>
                  ) : e.open ? (
                    <Badge>Berlangsung</Badge>
                  ) : (
                    <Badge variant="secondary">Segera</Badge>
                  )}
                  {e.minSolved > 0 && (
                    <Badge variant="secondary">Min. {e.minSolved} soal selesai</Badge>
                  )}
                  {e.maxClaims !== null && (
                    <Badge variant="outline">
                      Kuota {e._count.claims}/{e.maxClaims}
                    </Badge>
                  )}
                </div>
                <CardTitle>{e.name}</CardTitle>
                <CardDescription>{e.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm">
                  <p>
                    Reward <CoinAmount value={e.coinReward} />
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDateTime(e.startsAt)} — {formatDateTime(e.endsAt)}
                  </p>
                </div>
                {e.claimedAt ? (
                  <span className="text-muted-foreground text-sm">
                    Diklaim {formatDateTime(e.claimedAt)}
                  </span>
                ) : (
                  <ClaimButton
                    eventId={e.id}
                    disabled={!e.canClaim}
                    reason={
                      !e.open
                        ? "Belum dimulai"
                        : e.full
                          ? "Kuota habis"
                          : !e.eligible
                            ? `Selesaikan ${e.minSolved} soal dulu`
                            : undefined
                    }
                  />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
