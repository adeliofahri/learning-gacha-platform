import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/misc";
import { PackageForm } from "@/components/admin/package-form";
import { prisma } from "@/lib/db";
import { PackageDeleteButton } from "@/components/admin/package-delete-button";

export const metadata = { title: "Edit paket" };

export default async function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [pkg, subjects, questions] = await Promise.all([
    prisma.package.findUnique({
      where: { id },
      include: {
        items: { orderBy: { order: "asc" } },
        _count: {
          select: {
            items: true,
            progress: true,
            attempts: true,
          },
        },
      },
    }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.question.findMany({ include: { subject: true }, orderBy: { title: "asc" } }),
  ]);
  if (!pkg) notFound();
  return (
    <div>
      <PageHeader
        title="Edit paket"
        actions={
          <PackageDeleteButton
            preview={{
              packageId: pkg.id,
              title: pkg.title,
              questionCount: pkg._count.items,
              affectedStudents: pkg._count.progress,
              preservedAttempts: pkg._count.attempts,
            }}
          />
        }
      />
      <PackageForm
        subjects={subjects}
        questions={questions.map((q) => ({
          id: q.id,
          title: q.title,
          subject: q.subject.name,
          status: q.status,
          difficulty: q.difficulty,
        }))}
        initial={{
          id: pkg.id,
          title: pkg.title,
          description: pkg.description ?? "",
          coverImageUrl: pkg.coverImageUrl ?? "",
          subjectId: pkg.subjectId ?? "",
          status: pkg.status,
          questionIds: pkg.items.map((i) => i.questionId),
        }}
      />
    </div>
  );
}
