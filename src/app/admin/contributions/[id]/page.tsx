import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent } from "@/components/ui/card";
import { QuestionForm } from "@/components/admin/question-form";
import { CharacterForm } from "@/components/admin/character-form";
import { ContributionRejectButton } from "@/components/admin/contribution-reject-button";
import { requireAdminPage } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { getDifficultyConfig } from "@/server/services/learning.service";
import { libraryImages } from "@/server/services/upload.service";
import { formatDateTime } from "@/lib/utils";
import type { QuestionType } from "@prisma/client";
import type { CharacterInput } from "@/lib/validation/collection";

export const dynamic = "force-dynamic";

export default async function ContributionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const [item, subjects, bounties, library] = await Promise.all([
    prisma.contributionSubmission.findUnique({
      where: { id },
      include: { user: { select: { username: true } } },
    }),
    prisma.subject.findMany({
      include: { topics: { orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    }),
    getDifficultyConfig(),
    libraryImages(),
  ]);
  if (!item) notFound();
  const content = item.content as Record<string, unknown>;

  const questionInitial = item.type === "QUESTION" ? {
    subjectId: subjects[0]?.id ?? "",
    topicId: "",
    title: String(content.title ?? ""),
    content: String(content.content ?? ""),
    imageUrl: typeof content.imageUrl === "string" ? content.imageUrl : null,
    type: String(content.type ?? "MULTIPLE_CHOICE") as QuestionType,
    difficulty: "EASY" as const,
    bounty: bounties.EASY,
    explanation: String(content.explanation ?? ""),
    status: "DRAFT" as const,
    options: Array.isArray(content.options)
      ? content.options.map((o) => ({
          text: String((o as Record<string, unknown>).text ?? ""),
          isCorrect: Boolean((o as Record<string, unknown>).isCorrect),
        }))
      : [],
    acceptedAnswers: Array.isArray(content.acceptedAnswers)
      ? content.acceptedAnswers.map((answer) => ({ text: String(answer) }))
      : [],
  } : undefined;

  const characterInitial = item.type === "CHARACTER"
    ? ({
        name: String(content.name ?? ""),
        description: String(content.description ?? ""),
        rarity: Number(content.rarity ?? 3),
        imageUrl: String(content.imageUrl ?? library[0] ?? ""),
        category: content.category === "LIMITED" ? "LIMITED" : "PERMANENT",
        status: content.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE",
        limitedBorderType: content.limitedBorderType ?? "PRESET",
        limitedBorderConfig: content.limitedBorderConfig ?? null,
        limitedBorderImageUrl: content.limitedBorderImageUrl ?? null,
      } as CharacterInput)
    : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        title={item.type === "QUESTION" ? "Review kontribusi soal" : "Review kontribusi karakter"}
        description={`Dikirim oleh ${item.user.username} · ${formatDateTime(item.createdAt)}`}
        actions={<ContributionRejectButton id={item.id} />}
      />
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          {item.type === "QUESTION"
            ? "Periksa dan lengkapi soal. Mata pelajaran, topik, dan tingkat kesulitan ditetapkan oleh admin. Saat disetujui, soal langsung dipublikasikan dan reward diberikan satu kali."
            : "Periksa dan sunting semua detail karakter, termasuk rarity, artwork, border, dan efek. Saat disetujui, karakter dipublikasikan dan reward diberikan satu kali."}
        </CardContent>
      </Card>
      {item.type === "QUESTION" && questionInitial && (
        <QuestionForm
          subjects={subjects}
          bounties={bounties}
          initial={questionInitial as Parameters<typeof QuestionForm>[0]["initial"]}
          contributionId={item.id}
        />
      )}
      {item.type === "CHARACTER" && characterInitial && (
        <CharacterForm
          library={library}
          initial={characterInitial as Parameters<typeof CharacterForm>[0]["initial"]}
          contributionId={item.id}
        />
      )}
    </div>
  );
}
