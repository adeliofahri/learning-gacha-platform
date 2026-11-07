import { PageHeader } from "@/components/ui/misc";
import { QuestionForm } from "@/components/admin/question-form";
import { prisma } from "@/lib/db";
import { getDifficultyConfig } from "@/server/services/learning.service";

export const metadata = { title: "Soal baru" };

export default async function NewQuestionPage() {
  const [subjects, bounties] = await Promise.all([
    prisma.subject.findMany({
      include: { topics: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
    getDifficultyConfig(),
  ]);
  return (
    <div>
      <PageHeader
        title="Soal baru"
        description="Kunci jawaban tidak pernah dikirim ke siswa sebelum jawaban dinilai."
      />
      <QuestionForm subjects={subjects} bounties={bounties} />
    </div>
  );
}
