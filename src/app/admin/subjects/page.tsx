import { PageHeader } from "@/components/ui/misc";
import { SubjectManager } from "@/components/admin/subject-manager";
import { prisma } from "@/lib/db";

export const metadata = { title: "Mapel & topik" };

export default async function SubjectsPage() {
  const subjects = await prisma.subject.findMany({
    include: { topics: { orderBy: { name: "asc" } }, _count: { select: { questions: true } } },
    orderBy: { name: "asc" },
  });
  return (
    <div>
      <PageHeader title="Mata pelajaran & topik" />
      <SubjectManager
        subjects={subjects.map((s) => ({
          id: s.id,
          name: s.name,
          questionCount: s._count.questions,
          topics: s.topics.map((t) => ({ id: t.id, name: t.name })),
        }))}
      />
    </div>
  );
}
