import type { AttemptStatus, ContentStatus, Difficulty, Prisma, QuestionType } from "@prisma/client";
import { prisma, transaction, isUniqueViolation, type Tx } from "@/lib/db";
import { AppError, notFound } from "@/lib/errors";
import type { AttemptInput, PackageInput, QuestionInput } from "@/lib/validation/learning";
import {
  bountyForCorrectAnswer,
  defaultBounty,
  deriveQuestionStatus,
  normalizeAnswer,
  packageProgress,
  type DifficultyBountyConfig,
  type QuestionProgressStatus,
} from "@/server/domain/learning";
import { applyWalletChange } from "./wallet.service";
import { logAudit } from "./audit.service";

// ───────────────────────────── Konfigurasi ─────────────────────────────

export async function getDifficultyConfig(db: Tx | typeof prisma = prisma): Promise<DifficultyBountyConfig> {
  const rows = await db.difficultyConfig.findMany();
  const config: DifficultyBountyConfig = { EASY: 5, MEDIUM: 10, HARD: 20, EXPERT: 35 };
  for (const r of rows) config[r.difficulty] = r.bounty;
  return config;
}

// ───────────────────────────── Subject & Topic ─────────────────────────────

export async function createSubject(adminId: string, name: string) {
  try {
    return await transaction(async (tx) => {
      const s = await tx.subject.create({ data: { name } });
      await logAudit(tx, { actorId: adminId, action: "SUBJECT_CREATE", targetType: "Subject", targetId: s.id, metadata: { name } });
      return s;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("CONFLICT", "Mata pelajaran sudah ada");
    throw e;
  }
}

export async function renameSubject(adminId: string, id: string, name: string) {
  try {
    return await transaction(async (tx) => {
      const s = await tx.subject.update({ where: { id }, data: { name } });
      await logAudit(tx, { actorId: adminId, action: "SUBJECT_UPDATE", targetType: "Subject", targetId: id, metadata: { name } });
      return s;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("CONFLICT", "Mata pelajaran sudah ada");
    throw e;
  }
}

export async function createTopic(adminId: string, subjectId: string, name: string) {
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) throw notFound("Mata pelajaran");
  try {
    return await transaction(async (tx) => {
      const t = await tx.topic.create({ data: { subjectId, name } });
      await logAudit(tx, { actorId: adminId, action: "TOPIC_CREATE", targetType: "Topic", targetId: t.id, metadata: { name, subjectId } });
      return t;
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("CONFLICT", "Topik sudah ada pada mata pelajaran ini");
    throw e;
  }
}

// ───────────────────────────── Question (admin) ─────────────────────────────

async function assertTopicBelongs(tx: Tx, subjectId: string, topicId: string | null | undefined) {
  const subject = await tx.subject.findUnique({ where: { id: subjectId } });
  if (!subject) throw notFound("Mata pelajaran");
  if (topicId) {
    const topic = await tx.topic.findUnique({ where: { id: topicId } });
    if (!topic || topic.subjectId !== subjectId) {
      throw new AppError("BAD_REQUEST", "Topik tidak sesuai dengan mata pelajaran");
    }
  }
}

export async function createQuestion(adminId: string, input: QuestionInput) {
  return transaction(async (tx) => {
    await assertTopicBelongs(tx, input.subjectId, input.topicId);
    const bounty = input.bounty ?? defaultBounty(input.difficulty, await getDifficultyConfig(tx));
    const q = await tx.question.create({
      data: {
        subjectId: input.subjectId,
        topicId: input.topicId ?? null,
        title: input.title,
        content: input.content,
        type: input.type,
        difficulty: input.difficulty,
        bounty,
        explanation: input.explanation || null,
        status: input.status,
        createdById: adminId,
        options:
          input.type === "MULTIPLE_CHOICE"
            ? { create: input.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, order: i })) }
            : undefined,
        acceptedAnswers:
          input.type === "SHORT_ANSWER" ? { create: input.acceptedAnswers.map((text) => ({ text })) } : undefined,
      },
    });
    await logAudit(tx, {
      actorId: adminId,
      action: "QUESTION_CREATE",
      targetType: "Question",
      targetId: q.id,
      metadata: { title: q.title, type: q.type, bounty },
    });
    return q;
  });
}

/**
 * Update soal. Versi naik setiap kali konten diubah; attempt lama tetap memegang snapshot.
 * Tipe soal tidak boleh diubah bila sudah ada attempt.
 */
export async function updateQuestion(adminId: string, id: string, input: QuestionInput) {
  return transaction(async (tx) => {
    const existing = await tx.question.findUnique({ where: { id }, include: { _count: { select: { attempts: true } } } });
    if (!existing) throw notFound("Soal");
    if (existing.type !== input.type && existing._count.attempts > 0) {
      throw new AppError("CONFLICT", "Tipe soal tidak dapat diubah karena sudah pernah dikerjakan. Buat soal baru.");
    }
    await assertTopicBelongs(tx, input.subjectId, input.topicId);
    const bounty = input.bounty ?? existing.bounty;
    await tx.questionOption.deleteMany({ where: { questionId: id } });
    await tx.questionAcceptedAnswer.deleteMany({ where: { questionId: id } });
    const q = await tx.question.update({
      where: { id },
      data: {
        subjectId: input.subjectId,
        topicId: input.topicId ?? null,
        title: input.title,
        content: input.content,
        type: input.type,
        difficulty: input.difficulty,
        bounty,
        explanation: input.explanation || null,
        status: input.status,
        version: { increment: 1 },
        options:
          input.type === "MULTIPLE_CHOICE"
            ? { create: input.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, order: i })) }
            : undefined,
        acceptedAnswers:
          input.type === "SHORT_ANSWER" ? { create: input.acceptedAnswers.map((text) => ({ text })) } : undefined,
      },
    });
    await logAudit(tx, {
      actorId: adminId,
      action: "QUESTION_UPDATE",
      targetType: "Question",
      targetId: id,
      metadata: { version: q.version, bountyBefore: existing.bounty, bountyAfter: bounty, status: q.status },
    });
    return q;
  });
}

export async function setQuestionStatus(adminId: string, id: string, status: ContentStatus) {
  return transaction(async (tx) => {
    const q = await tx.question.update({ where: { id }, data: { status } }).catch(() => {
      throw notFound("Soal");
    });
    await logAudit(tx, { actorId: adminId, action: "QUESTION_STATUS", targetType: "Question", targetId: id, metadata: { status } });
    return q;
  });
}

export async function listQuestionsAdmin(filters: {
  search?: string;
  subjectId?: string;
  status?: ContentStatus;
  type?: QuestionType;
  difficulty?: Difficulty;
  page: number;
  pageSize: number;
}) {
  const where: Prisma.QuestionWhereInput = {
    subjectId: filters.subjectId || undefined,
    status: filters.status || undefined,
    type: filters.type || undefined,
    difficulty: filters.difficulty || undefined,
    OR: filters.search
      ? [
          { title: { contains: filters.search, mode: "insensitive" } },
          { content: { contains: filters.search, mode: "insensitive" } },
        ]
      : undefined,
  };
  const [items, total] = await Promise.all([
    prisma.question.findMany({
      where,
      include: { subject: true, topic: true, _count: { select: { attempts: true, solves: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.question.count({ where }),
  ]);
  return { items, total };
}

// ───────────────────────────── Package (admin) ─────────────────────────────

async function writePackageItems(tx: Tx, packageId: string, questionIds: string[]) {
  if (questionIds.length) {
    const found = await tx.question.count({ where: { id: { in: questionIds }, status: { not: "ARCHIVED" } } });
    if (found !== questionIds.length) throw new AppError("BAD_REQUEST", "Ada soal yang tidak ditemukan atau diarsipkan");
  }
  await tx.packageQuestion.deleteMany({ where: { packageId } });
  if (questionIds.length) {
    await tx.packageQuestion.createMany({
      data: questionIds.map((questionId, order) => ({ packageId, questionId, order })),
    });
  }
}

export async function createPackage(adminId: string, input: PackageInput) {
  return transaction(async (tx) => {
    const pkg = await tx.package.create({
      data: { title: input.title, description: input.description || null, subjectId: input.subjectId || null, status: input.status },
    });
    await writePackageItems(tx, pkg.id, input.questionIds);
    await logAudit(tx, {
      actorId: adminId,
      action: "PACKAGE_CREATE",
      targetType: "Package",
      targetId: pkg.id,
      metadata: { title: pkg.title, questionCount: input.questionIds.length },
    });
    return pkg;
  });
}

export async function updatePackage(adminId: string, id: string, input: PackageInput) {
  return transaction(async (tx) => {
    const existing = await tx.package.findUnique({ where: { id } });
    if (!existing) throw notFound("Paket");
    const pkg = await tx.package.update({
      where: { id },
      data: { title: input.title, description: input.description || null, subjectId: input.subjectId || null, status: input.status },
    });
    await writePackageItems(tx, id, input.questionIds);
    await logAudit(tx, {
      actorId: adminId,
      action: "PACKAGE_UPDATE",
      targetType: "Package",
      targetId: id,
      metadata: { status: pkg.status, questionCount: input.questionIds.length },
    });
    return pkg;
  });
}

// ───────────────────────────── Student views ─────────────────────────────

async function statusMap(userId: string, questionIds: string[]) {
  const [solves, attempts] = await Promise.all([
    prisma.questionSolve.findMany({ where: { userId, questionId: { in: questionIds } }, select: { questionId: true } }),
    prisma.attempt.findMany({
      where: { userId, questionId: { in: questionIds } },
      select: { questionId: true, status: true },
    }),
  ]);
  const solved = new Set(solves.map((s) => s.questionId));
  const byQ = new Map<string, AttemptStatus[]>();
  for (const a of attempts) byQ.set(a.questionId, [...(byQ.get(a.questionId) ?? []), a.status]);
  const result = new Map<string, QuestionProgressStatus>();
  for (const id of questionIds) {
    result.set(id, deriveQuestionStatus({ solved: solved.has(id), attemptStatuses: byQ.get(id) ?? [] }));
  }
  return { result, solved };
}

export async function listPackagesForStudent(
  userId: string,
  filters: { subjectId?: string; difficulty?: Difficulty } = {},
) {
  const packages = await prisma.package.findMany({
    where: {
      status: "PUBLISHED",
      subjectId: filters.subjectId || undefined,
      items: filters.difficulty
        ? { some: { question: { difficulty: filters.difficulty, status: "PUBLISHED" } } }
        : undefined,
    },
    include: {
      subject: true,
      items: { where: { question: { status: "PUBLISHED" } }, select: { questionId: true, question: { select: { difficulty: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
  const allIds = packages.flatMap((p) => p.items.map((i) => i.questionId));
  const solves = await prisma.questionSolve.findMany({
    where: { userId, questionId: { in: allIds } },
    select: { questionId: true },
  });
  const solved = new Set(solves.map((s) => s.questionId));
  return packages.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    subject: p.subject?.name ?? null,
    difficulties: Array.from(new Set(p.items.map((i) => i.question.difficulty))),
    progress: packageProgress(
      p.items.map((i) => i.questionId),
      solved,
    ),
  }));
}

export type StudentQuestionView = {
  id: string;
  order: number;
  title: string;
  content: string;
  type: QuestionType;
  difficulty: Difficulty;
  bounty: number;
  status: QuestionProgressStatus;
  options: { id: string; text: string }[]; // TANPA isCorrect
  explanation: string | null; // hanya setelah solved
  correctOptionId: string | null; // hanya setelah solved
  acceptedAnswers: string[]; // hanya setelah solved (isian)
  lastReview: { status: AttemptStatus; feedback: string | null; reviewedAt: Date | null; answerText: string | null } | null;
};

export async function getPackageForStudent(userId: string, packageId: string) {
  const pkg = await prisma.package.findFirst({
    where: { id: packageId, status: "PUBLISHED" },
    include: {
      subject: true,
      items: {
        where: { question: { status: "PUBLISHED" } },
        orderBy: { order: "asc" },
        include: {
          question: {
            include: { options: { orderBy: { order: "asc" } }, acceptedAnswers: true },
          },
        },
      },
    },
  });
  if (!pkg) throw notFound("Paket");
  const ids = pkg.items.map((i) => i.questionId);
  const { result, solved } = await statusMap(userId, ids);
  const lastShort = await prisma.attempt.findMany({
    where: { userId, questionId: { in: ids }, answerText: { not: null }, isPractice: false },
    orderBy: { createdAt: "desc" },
    distinct: ["questionId"],
    select: { questionId: true, status: true, feedback: true, reviewedAt: true, answerText: true },
  });
  const lastByQ = new Map(lastShort.map((a) => [a.questionId, a]));

  const questions: StudentQuestionView[] = pkg.items.map((item, index) => {
    const q = item.question;
    const isSolved = solved.has(q.id);
    const last = lastByQ.get(q.id);
    return {
      id: q.id,
      order: index + 1,
      title: q.title,
      content: q.content,
      type: q.type,
      difficulty: q.difficulty,
      bounty: q.bounty,
      status: result.get(q.id) ?? "UNSOLVED",
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
      explanation: isSolved ? q.explanation : null,
      correctOptionId: isSolved ? (q.options.find((o) => o.isCorrect)?.id ?? null) : null,
      acceptedAnswers: isSolved && q.type === "SHORT_ANSWER" ? q.acceptedAnswers.map((a) => a.text) : [],
      lastReview: last
        ? { status: last.status, feedback: last.feedback, reviewedAt: last.reviewedAt, answerText: last.answerText }
        : null,
    };
  });
  return {
    id: pkg.id,
    title: pkg.title,
    description: pkg.description,
    subject: pkg.subject?.name ?? null,
    questions,
    progress: packageProgress(ids, solved),
  };
}

// ───────────────────────────── Attempt submission ─────────────────────────────

export type AttemptResult = {
  attemptId: string;
  status: AttemptStatus;
  isPractice: boolean;
  correct: boolean | null;
  bountyAwarded: number;
  correctOptionId: string | null;
  explanation: string | null;
  acceptedAnswers: string[];
  coins: number;
  replayed: boolean;
};

async function buildAttemptResult(attemptId: string, replayed: boolean): Promise<AttemptResult> {
  const a = await prisma.attempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: {
      solve: true,
      question: { include: { options: true, acceptedAnswers: true } },
      user: { select: { wallet: { select: { coins: true } } } },
    },
  });
  const solvedNow = await prisma.questionSolve.findUnique({
    where: { userId_questionId: { userId: a.userId, questionId: a.questionId } },
  });
  const reveal = Boolean(solvedNow) && a.status !== "PENDING_REVIEW";
  return {
    attemptId: a.id,
    status: a.status,
    isPractice: a.isPractice,
    correct: a.status === "CORRECT" || a.status === "APPROVED" ? true : a.status === "PENDING_REVIEW" ? null : false,
    bountyAwarded: a.solve?.bountyAwarded ?? 0,
    correctOptionId: reveal ? (a.question.options.find((o) => o.isCorrect)?.id ?? null) : null,
    explanation: reveal ? a.question.explanation : null,
    acceptedAnswers: reveal && a.question.type === "SHORT_ANSWER" ? a.question.acceptedAnswers.map((x) => x.text) : [],
    coins: a.user.wallet?.coins ?? 0,
    replayed,
  };
}

async function awardSolve(tx: Tx, params: { userId: string; questionId: string; attemptId: string; bounty: number; title: string }) {
  const amount = bountyForCorrectAnswer({ alreadySolved: false, bounty: params.bounty });
  await tx.questionSolve.create({
    data: { userId: params.userId, questionId: params.questionId, attemptId: params.attemptId, bountyAwarded: amount },
  });
  if (amount > 0) {
    await applyWalletChange(tx, {
      userId: params.userId,
      currency: "COIN",
      amount,
      type: "QUESTION_REWARD",
      referenceType: "Question",
      referenceId: params.questionId,
      description: `Bounty: ${params.title}`,
      metadata: { attemptId: params.attemptId },
    });
  }
  return amount;
}

export async function submitAttempt(params: {
  userId: string;
  questionId: string;
  input: AttemptInput;
  idempotencyKey: string;
}): Promise<AttemptResult> {
  const { userId, questionId, input, idempotencyKey } = params;

  const replay = await prisma.attempt.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey } } });
  if (replay) {
    if (replay.questionId !== questionId) throw new AppError("CONFLICT", "Idempotency-Key sudah dipakai untuk request lain");
    return buildAttemptResult(replay.id, true);
  }

  const question = await prisma.question.findFirst({
    where: { id: questionId, status: "PUBLISHED" },
    include: { options: { orderBy: { order: "asc" } }, acceptedAnswers: true },
  });
  if (!question) throw notFound("Soal");

  if (input.packageId) {
    const inPackage = await prisma.packageQuestion.findFirst({
      where: { packageId: input.packageId, questionId, package: { status: "PUBLISHED" } },
    });
    if (!inPackage) throw new AppError("BAD_REQUEST", "Soal tidak ada di paket ini");
  }

  if (question.type === "MULTIPLE_CHOICE") {
    if (!input.optionId) throw new AppError("BAD_REQUEST", "Pilih salah satu jawaban");
    if (!question.options.some((o) => o.id === input.optionId)) {
      throw new AppError("BAD_REQUEST", "Pilihan jawaban tidak valid untuk soal ini");
    }
  } else if (!input.answerText) {
    throw new AppError("BAD_REQUEST", "Jawaban wajib diisi");
  }

  const snapshotBase = {
    title: question.title,
    content: question.content,
    type: question.type,
    difficulty: question.difficulty,
    bounty: question.bounty,
    options: question.options.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
  };

  const run = () =>
    transaction(async (tx) => {
      const alreadySolved = Boolean(
        await tx.questionSolve.findUnique({ where: { userId_questionId: { userId, questionId } } }),
      );

      let status: AttemptStatus;
      let selectedText: string | null = null;
      if (question.type === "MULTIPLE_CHOICE") {
        const option = question.options.find((o) => o.id === input.optionId)!;
        selectedText = option.text;
        status = option.isCorrect ? "CORRECT" : "INCORRECT";
      } else if (alreadySolved) {
        // Latihan isian setelah solved: dicek otomatis terhadap jawaban acuan, tanpa review & tanpa reward.
        const norm = normalizeAnswer(input.answerText!);
        status = question.acceptedAnswers.some((a) => normalizeAnswer(a.text) === norm) ? "CORRECT" : "INCORRECT";
      } else {
        const pending = await tx.attempt.findFirst({ where: { userId, questionId, status: "PENDING_REVIEW" } });
        if (pending) throw new AppError("CONFLICT", "Jawaban sebelumnya masih menunggu review admin");
        status = "PENDING_REVIEW";
      }

      const attempt = await tx.attempt.create({
        data: {
          userId,
          questionId,
          packageId: input.packageId ?? null,
          questionVersion: question.version,
          selectedOptionId: question.type === "MULTIPLE_CHOICE" ? input.optionId : null,
          answerText: question.type === "SHORT_ANSWER" ? input.answerText : null,
          status,
          isPractice: alreadySolved,
          idempotencyKey,
          snapshot: { ...snapshotBase, selectedOptionText: selectedText },
        },
      });

      if (status === "CORRECT" && !alreadySolved && question.type === "MULTIPLE_CHOICE") {
        await awardSolve(tx, { userId, questionId, attemptId: attempt.id, bounty: question.bounty, title: question.title });
      }

      if (input.packageId) {
        await tx.packageProgress.upsert({
          where: { userId_packageId: { userId, packageId: input.packageId } },
          create: { userId, packageId: input.packageId },
          update: { lastActivityAt: new Date() },
        });
      }
      return attempt.id;
    });

  let attemptId: string;
  try {
    attemptId = await run();
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    // Request ganda bersamaan: idempotency key atau solve record sudah dibuat oleh request lain.
    const again = await prisma.attempt.findUnique({ where: { userId_idempotencyKey: { userId, idempotencyKey } } });
    if (again) return buildAttemptResult(again.id, true);
    attemptId = await run(); // sekarang tercatat sebagai latihan (tanpa bounty)
  }
  return buildAttemptResult(attemptId, false);
}

// ───────────────────────────── Review (admin) ─────────────────────────────

export async function listPendingReviews(page: number, pageSize: number) {
  const where = { status: "PENDING_REVIEW" as const };
  const [items, total] = await Promise.all([
    prisma.attempt.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, username: true } },
        question: { include: { acceptedAnswers: true, subject: true } },
      },
    }),
    prisma.attempt.count({ where }),
  ]);
  return { items, total };
}

export async function reviewAttempt(params: {
  adminId: string;
  attemptId: string;
  decision: "APPROVE" | "REJECT";
  feedback?: string | null;
}) {
  const run = () =>
    transaction(async (tx) => {
      const attempt = await tx.attempt.findUnique({ where: { id: params.attemptId }, include: { question: true } });
      if (!attempt) throw notFound("Jawaban");
      // Update bersyarat: hanya satu reviewer yang bisa memproses attempt ini.
      const updated = await tx.attempt.updateMany({
        where: { id: params.attemptId, status: "PENDING_REVIEW" },
        data: {
          status: params.decision === "APPROVE" ? "APPROVED" : "REJECTED",
          reviewedById: params.adminId,
          reviewedAt: new Date(),
          feedback: params.feedback || null,
        },
      });
      if (updated.count === 0) throw new AppError("CONFLICT", "Jawaban ini sudah direview");

      let bountyAwarded = 0;
      if (params.decision === "APPROVE") {
        const solved = await tx.questionSolve.findUnique({
          where: { userId_questionId: { userId: attempt.userId, questionId: attempt.questionId } },
        });
        if (!solved) {
          bountyAwarded = await awardSolve(tx, {
            userId: attempt.userId,
            questionId: attempt.questionId,
            attemptId: attempt.id,
            bounty: attempt.question.bounty,
            title: attempt.question.title,
          });
        }
      }
      await logAudit(tx, {
        actorId: params.adminId,
        action: params.decision === "APPROVE" ? "REVIEW_APPROVE" : "REVIEW_REJECT",
        targetType: "Attempt",
        targetId: attempt.id,
        metadata: { userId: attempt.userId, questionId: attempt.questionId, bountyAwarded },
      });
      return { attemptId: attempt.id, bountyAwarded };
    });
  try {
    return await run();
  } catch (error) {
    if (isUniqueViolation(error)) throw new AppError("CONFLICT", "Jawaban ini sudah direview");
    throw error;
  }
}

// ───────────────────────────── Statistik siswa ─────────────────────────────

export async function getLearningSummary(userId: string) {
  const [solvedCount, publishedCount, pendingCount, recent] = await Promise.all([
    prisma.questionSolve.count({ where: { userId } }),
    prisma.question.count({ where: { status: "PUBLISHED" } }),
    prisma.attempt.count({ where: { userId, status: "PENDING_REVIEW" } }),
    prisma.packageProgress.findMany({
      where: { userId, package: { status: "PUBLISHED" } },
      orderBy: { lastActivityAt: "desc" },
      take: 3,
      include: { package: { include: { items: { where: { question: { status: "PUBLISHED" } }, select: { questionId: true } } } } },
    }),
  ]);
  const ids = recent.flatMap((r) => r.package.items.map((i) => i.questionId));
  const solves = await prisma.questionSolve.findMany({ where: { userId, questionId: { in: ids } }, select: { questionId: true } });
  const solvedSet = new Set(solves.map((s) => s.questionId));
  return {
    solvedCount,
    publishedCount,
    pendingCount,
    inProgress: recent.map((r) => ({
      packageId: r.packageId,
      title: r.package.title,
      lastActivityAt: r.lastActivityAt,
      progress: packageProgress(
        r.package.items.map((i) => i.questionId),
        solvedSet,
      ),
    })),
  };
}
