import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/misc";
import { PackageForm } from "@/components/admin/package-form";
import { prisma } from "@/lib/db";

export const metadata = { title: "Edit paket" };

export default async function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [pkg, subjects, questions] = await Promise.all([
    prisma.package.findUnique({ where: { id }, include: { items: { orderBy: { order: "asc" } } } }),
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.question.findMany({ include: { subject: true }, orderBy: { title: "asc" } }),
  ]);
  if (!pkg) notFound();
  return (
    <div>
      <PageHeader title="Edit paket" />
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
          subjectId: pkg.subjectId ?? "",
          status: pkg.status,
          questionIds: pkg.items.map((i) => i.questionId),
        }}
      />
    </div>
  );
}
