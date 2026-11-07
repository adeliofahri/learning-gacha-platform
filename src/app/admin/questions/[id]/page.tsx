import { notFound } from "next/navigation";
import { PageHeader, Alert } from "@/components/ui/misc";
import { QuestionForm } from "@/components/admin/question-form";
import { prisma } from "@/lib/db";
import { getDifficultyConfig } from "@/server/services/learning.service";

export const metadata = { title: "Edit soal" };

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [q, subjects, bounties] = await Promise.all([
    prisma.question.findUnique({
      where: { id },
      include: {
        options: { orderBy: { order: "asc" } },
        acceptedAnswers: true,
        _count: { select: { attempts: true, solves: true } },
      },
    }),
    prisma.subject.findMany({
      include: { topics: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
    getDifficultyConfig(),
  ]);
  if (!q) notFound();
  return (
    <div>
      <PageHeader
        title={`Edit soal (v${q.version})`}
        description={`${q._count.attempts} attempt · ${q._count.solves} siswa solved`}
      />
      {q._count.attempts > 0 && (
        <Alert variant="warning" className="mb-4" title="Soal sudah pernah dikerjakan">
          Perubahan akan menaikkan versi soal; histori attempt tetap menyimpan snapshot lama. Tipe
          soal tidak dapat diubah. Mengubah bounty tidak memberi reward tambahan kepada siswa yang
          sudah solved. Soal tidak dapat dihapus — gunakan status Diarsipkan.
        </Alert>
      )}
      <QuestionForm
        subjects={subjects}
        bounties={bounties}
        lockType={q._count.attempts > 0}
        initial={{
          id: q.id,
          subjectId: q.subjectId,
          topicId: q.topicId ?? "",
          title: q.title,
          content: q.content,
          imageUrl: q.imageUrl,
          type: q.type,
          difficulty: q.difficulty,
          bounty: q.bounty,
          explanation: q.explanation ?? "",
          status: q.status,
          options: q.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
          acceptedAnswers: q.acceptedAnswers.map((a) => ({ text: a.text })),
        }}
      />
    </div>
  );
}
