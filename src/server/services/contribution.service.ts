import { Prisma } from "@prisma/client";
import { prisma, transaction, type Tx } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import { questionSchema } from "@/lib/validation/learning";
import { characterSchema } from "@/lib/validation/collection";
import { contributionQuestionSchema } from "@/lib/validation/contribution";
import { getDifficultyConfig } from "./learning.service";
import { applyWalletChange } from "./wallet.service";
import { logAudit } from "./audit.service";

const LIMITS = { QUESTION: 5, CHARACTER: 3 } as const;

function currentWeekStart(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const localDate = new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
  const weekday = localDate.getUTCDay();
  localDate.setUTCDate(localDate.getUTCDate() - ((weekday + 6) % 7));
  return localDate;
}

export async function getContributionDashboard(userId: string) {
  const weekStart = currentWeekStart();
  const [quotas, pending, publishedQuestions, publishedCharacters, user] = await Promise.all([
    prisma.contributionQuota.findMany({ where: { userId, weekStart } }),
    prisma.contributionSubmission.count({ where: { userId, status: "PENDING" } }),
    prisma.question.count({ where: { createdById: userId, status: "PUBLISHED" } }),
    prisma.character.count({ where: { createdById: userId } }),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { contributionPoints: true },
    }),
  ]);
  return {
    weekStart,
    quotas: {
      QUESTION: { used: quotas.find((q) => q.type === "QUESTION")?.count ?? 0, limit: LIMITS.QUESTION },
      CHARACTER: { used: quotas.find((q) => q.type === "CHARACTER")?.count ?? 0, limit: LIMITS.CHARACTER },
    },
    pending,
    publishedQuestions,
    publishedCharacters,
    contributionPoints: user.contributionPoints,
  };
}

export async function createContributionSubmission(
  userId: string,
  type: "QUESTION" | "CHARACTER",
  rawContent: unknown,
) {
  const content = type === "QUESTION"
    ? contributionQuestionSchema.parse(rawContent)
    : characterSchema.parse(rawContent);
  const submittedAt = new Date();
  const weekStart = currentWeekStart(submittedAt);

  return transaction(async (tx) => {
    // Ensure one quota row exists, then atomically consume a slot.
    await tx.contributionQuota.createMany({
      data: [{ userId, weekStart, type, count: 0 }],
      skipDuplicates: true,
    });
    const consumed = await tx.contributionQuota.updateMany({
      where: { userId, weekStart, type, count: { lt: LIMITS[type] } },
      data: { count: { increment: 1 } },
    });
    if (consumed.count !== 1) {
      throw new AppError(
        "FORBIDDEN",
        type === "QUESTION"
          ? "Kuota kontribusi soal minggu ini sudah habis (maksimal 5)."
          : "Kuota kontribusi karakter minggu ini sudah habis (maksimal 3).",
      );
    }
    return tx.contributionSubmission.create({
      data: { userId, type, content: content as Prisma.InputJsonValue, createdAt: submittedAt },
      select: { id: true, type: true, createdAt: true },
    });
  });
}

export async function listPendingContributions(page = 1, pageSize = 20) {
  const where = { status: "PENDING" as const };
  const [items, total] = await Promise.all([
    prisma.contributionSubmission.findMany({
      where,
      include: { user: { select: { id: true, username: true } } },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.contributionSubmission.count({ where }),
  ]);
  return { items, total };
}

async function lockSubmission(tx: Tx, id: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "ContributionSubmission" WHERE "id" = ${id} FOR UPDATE
  `;
  if (!rows.length) throw notFound("Kontribusi");
  const submission = await tx.contributionSubmission.findUnique({ where: { id } });
  if (!submission) throw notFound("Kontribusi");
  return submission;
}

export async function rejectContribution(id: string) {
  return transaction(async (tx) => {
    await lockSubmission(tx, id);
    await tx.contributionSubmission.delete({ where: { id } });
    // Submission dihapus permanen; tidak disimpan sebagai riwayat penolakan.
    return { id, rejected: true };
  });
}

export async function approveContribution(
  adminId: string,
  id: string,
  editedContent?: unknown,
) {
  return transaction(async (tx) => {
    const submission = await lockSubmission(tx, id);
    const raw = editedContent ?? submission.content;

    let contentId: string;
    let coinAmount: number;
    let pointsAmount: number;

    if (submission.type === "QUESTION") {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        throw new AppError("BAD_REQUEST", "Data kontribusi soal tidak valid.");
      }
      const draftRaw = { ...(raw as Record<string, unknown>) };
      const subjectId = draftRaw.subjectId;
      const topicId = draftRaw.topicId;
      const difficulty = draftRaw.difficulty;
      delete draftRaw.subjectId;
      delete draftRaw.topicId;
      delete draftRaw.difficulty;
      delete draftRaw.bounty;
      delete draftRaw.status;
      if (typeof subjectId !== "string" || typeof difficulty !== "string") {
        throw new AppError("BAD_REQUEST", "Admin harus menetapkan mata pelajaran dan tingkat kesulitan.");
      }
      const draft = contributionQuestionSchema.parse(draftRaw);
      const input = questionSchema.parse({
        ...draft,
        subjectId,
        topicId: topicId ?? null,
        difficulty,
        status: "PUBLISHED",
      });
      if (input.topicId) {
        const topic = await tx.topic.findFirst({
          where: { id: input.topicId, subjectId: input.subjectId },
          select: { id: true },
        });
        if (!topic) throw new AppError("BAD_REQUEST", "Topik tidak sesuai dengan mata pelajaran.");
      }
      const config = await getDifficultyConfig(tx);
      const bounty = config[input.difficulty] ?? 0;
      const question = await tx.question.create({
        data: {
          subjectId: input.subjectId,
          topicId: input.topicId ?? null,
          title: input.title,
          content: input.content,
          imageUrl: input.imageUrl ?? null,
          type: input.type,
          difficulty: input.difficulty,
          bounty,
          explanation: input.explanation || null,
          status: "PUBLISHED",
          createdById: submission.userId,
          options: input.type !== "SHORT_ANSWER"
            ? { create: input.options.map((o, order) => ({ text: o.text, isCorrect: o.isCorrect, order })) }
            : undefined,
          acceptedAnswers: input.type === "SHORT_ANSWER"
            ? { create: input.acceptedAnswers.map((text) => ({ text })) }
            : undefined,
        },
      });
      contentId = question.id;
      coinAmount = Math.floor(bounty * 0.8);
      pointsAmount = 2;
    } else {
      const input = characterSchema.parse({ ...(raw as Record<string, unknown>), status: "ACTIVE" });
      const character = await tx.character.create({
        data: {
          ...input,
          createdById: submission.userId,
          limitedBorderConfig: input.limitedBorderConfig === undefined
            ? undefined
            : input.limitedBorderConfig === null
              ? Prisma.DbNull
              : input.limitedBorderConfig,
        },
      });
      contentId = character.id;
      coinAmount = 100;
      pointsAmount = 1;
    }

    await tx.wallet.upsert({
      where: { userId: submission.userId },
      create: { userId: submission.userId },
      update: {},
    });
    if (coinAmount > 0) {
      await applyWalletChange(tx, {
        userId: submission.userId,
        currency: "COIN",
        amount: coinAmount,
        type: "CONTRIBUTION_REWARD",
        referenceType: "CONTRIBUTION",
        referenceId: id,
        description: submission.type === "QUESTION" ? "Reward kontribusi soal" : "Reward kontribusi karakter",
        metadata: { contributionType: submission.type, contentId, pointsAmount },
        actorId: adminId,
      });
    }
    await tx.user.update({
      where: { id: submission.userId },
      data: { contributionPoints: { increment: pointsAmount } },
    });
    await tx.contributionReward.create({
      data: {
        sourceSubmissionId: id,
        userId: submission.userId,
        type: submission.type,
        contentId,
        coinAmount,
        pointsAmount,
      },
    });
    await tx.contributionSubmission.delete({ where: { id } });
    await logAudit(tx, {
      actorId: adminId,
      action: "CONTRIBUTION_APPROVE",
      targetType: submission.type === "QUESTION" ? "Question" : "Character",
      targetId: contentId,
      metadata: { contributorId: submission.userId, coinAmount, pointsAmount },
    });
    return { contentId, type: submission.type, coinAmount, pointsAmount };
  });
}
