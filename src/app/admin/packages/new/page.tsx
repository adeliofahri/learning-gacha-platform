import { PageHeader } from "@/components/ui/misc";
import { PackageForm } from "@/components/admin/package-form";
import { prisma } from "@/lib/db";

export const metadata = { title: "Paket baru" };

export default async function NewPackagePage() {
  const [subjects, questions] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: "asc" } }),
    prisma.question.findMany({
      where: { status: { not: "ARCHIVED" } },
      include: { subject: true },
      orderBy: { title: "asc" },
    }),
  ]);
  return (
    <div>
      <PageHeader title="Paket baru" />
      <PackageForm
        subjects={subjects}
        questions={questions.map((q) => ({
          id: q.id,
          title: q.title,
          subject: q.subject.name,
          status: q.status,
          difficulty: q.difficulty,
        }))}
      />
    </div>
  );
}
