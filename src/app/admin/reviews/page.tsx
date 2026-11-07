import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageHeader, Pagination } from "@/components/ui/misc";
import { ReviewItem } from "@/components/admin/review-actions";
import { listPendingReviews } from "@/server/services/learning.service";
import { normalizeAnswer } from "@/server/domain/learning";
import { prisma } from "@/lib/db";
import { clampPage, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Review jawaban" };
const PAGE_SIZE = 10;

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = clampPage((await searchParams).page);
  const [{ items, total }, recent] = await Promise.all([
    listPendingReviews(page, PAGE_SIZE),
    prisma.attempt.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] }, reviewedAt: { not: null } },
      orderBy: { reviewedAt: "desc" },
      take: 10,
      include: {
        user: { select: { username: true } },
        reviewedBy: { select: { username: true } },
        question: { select: { title: true } },
      },
    }),
  ]);
  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          title="Review jawaban isian"
          description={`${total} jawaban menunggu review. Approve memberi bounty satu kali; reject memungkinkan siswa mengirim ulang.`}
        />
        {items.length === 0 ? (
          <EmptyState
            title="Tidak ada jawaban yang menunggu"
            description="Semua jawaban sudah diperiksa. 🎉"
          />
        ) : (
          <div className="space-y-4">
            {items.map((a) => {
              const match = a.question.acceptedAnswers.some(
                (x) => normalizeAnswer(x.text) === normalizeAnswer(a.answerText ?? ""),
              );
              return (
                <Card key={a.id}>
                  <ReviewItem attemptId={a.id}>
                    <CardHeader>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge>{a.question.subject.name}</Badge>
                        <span className="font-semibold">{a.user.username}</span>
                        <span className="text-muted-foreground">
                          · {formatDateTime(a.createdAt)}
                        </span>
                        <span className="text-muted-foreground">
                          · versi soal v{a.questionVersion}
                        </span>
                        <span className="ml-auto">Bounty {a.question.bounty}</span>
                      </div>
                      <CardTitle>{a.question.title}</CardTitle>
                      <p className="text-muted-foreground text-sm whitespace-pre-wrap">
                        {a.question.content}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="bg-muted/50 rounded-md border p-3">
                        <p className="text-muted-foreground text-xs font-semibold uppercase">
                          Jawaban siswa
                        </p>
                        <p className="whitespace-pre-wrap">{a.answerText}</p>
                      </div>
                      {a.question.acceptedAnswers.length > 0 && (
                        <p className="text-sm">
                          Acuan: {a.question.acceptedAnswers.map((x) => x.text).join(" · ")}{" "}
                          {match ? (
                            <Badge variant="success">Cocok dengan acuan</Badge>
                          ) : (
                            <Badge variant="secondary">Tidak persis sama</Badge>
                          )}
                        </p>
                      )}
                    </CardContent>
                  </ReviewItem>
                </Card>
              );
            })}
          </div>
        )}
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} baseHref="/admin/reviews" />
      </div>
      {recent.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-bold">Riwayat review terakhir</h2>
          <ul className="bg-card divide-y rounded-lg border text-sm">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 px-4 py-2">
                <Badge variant={r.status === "APPROVED" ? "success" : "destructive"}>
                  {r.status === "APPROVED" ? "Disetujui" : "Ditolak"}
                </Badge>
                <span className="font-medium">{r.question.title}</span>
                <span className="text-muted-foreground">
                  — {r.user.username} · oleh {r.reviewedBy?.username ?? "?"} ·{" "}
                  {r.reviewedAt && formatDateTime(r.reviewedAt)}
                </span>
                {r.feedback && (
                  <span className="text-muted-foreground w-full text-xs">
                    Feedback: {r.feedback}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
