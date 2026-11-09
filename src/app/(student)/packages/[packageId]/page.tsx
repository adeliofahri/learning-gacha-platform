import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState, Progress } from "@/components/ui/misc";
import { QuestionCard } from "@/components/learning/question-card";
import { requireStudentPage } from "@/lib/auth/current-user";
import { getPackageForStudent } from "@/server/services/learning.service";
import { AppError } from "@/lib/errors";
import { PackageCover } from "@/components/learning/package-cover";

export const metadata = { title: "Paket soal" };

export default async function PackagePage({ params }: { params: Promise<{ packageId: string }> }) {
  const user = await requireStudentPage();
  const { packageId } = await params;
  let pkg;
  try {
    pkg = await getPackageForStudent(user.id, packageId);
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/learn"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm font-semibold"
      >
        <ArrowLeft className="size-4" aria-hidden /> Semua paket
      </Link>
        <div className="bg-card overflow-hidden rounded-lg border">
          <PackageCover
            imageUrl={pkg.coverImageUrl}
            subject={pkg.subject}
            title={pkg.title}
          />

          <div className="space-y-3 p-5">
            {pkg.subject && <Badge>{pkg.subject}</Badge>}

            <h1 className="text-2xl font-black">{pkg.title}</h1>

            {pkg.description && (
              <p className="text-muted-foreground">{pkg.description}</p>
            )}

            <Progress value={pkg.progress.percent} label="Progress paket" />

            <p className="text-muted-foreground text-sm" data-testid="package-progress">
              {pkg.progress.solved}/{pkg.progress.total} soal selesai ({pkg.progress.percent}%)
            </p>
          </div>
        </div>
      {pkg.questions.length === 0 ? (
        <EmptyState title="Paket ini belum berisi soal" />
      ) : (
        pkg.questions.map((q) => <QuestionCard key={q.id} question={q} packageId={pkg.id} />)
      )}
    </div>
  );
}
