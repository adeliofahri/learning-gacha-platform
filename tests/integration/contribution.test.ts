import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  createContributionSubmission,
  approveContribution,
  rejectContribution,
} from "@/server/services/contribution.service";
import { makeSubject, registerStudent, createAdmin, resetDb, makeMcQuestion, makePackage, coins } from "./helpers";

beforeEach(resetDb);

const questionDraft = (title: string) => ({
  type: "MULTIPLE_CHOICE" as const,
  title,
  content: "Berapakah hasil 2 + 2?",
  imageUrl: null,
  explanation: "Penjumlahan dasar.",
  options: [
    { text: "4", isCorrect: true },
    { text: "5", isCorrect: false },
  ],
});

describe("Contribution System", () => {
  it("membatasi kuota mingguan dan penolakan tidak mengembalikan kuota", async () => {
    const student = await registerStudent();
    const submissions = [];
    for (let i = 0; i < 5; i += 1) {
      submissions.push(
        await createContributionSubmission(student.id, "QUESTION", questionDraft(`Soal ${i}`)),
      );
    }

    await expect(
      createContributionSubmission(student.id, "QUESTION", questionDraft("Soal keenam")),
    ).rejects.toThrow(/Kuota kontribusi soal/);

    await rejectContribution(submissions[0]!.id);
    await expect(
      createContributionSubmission(student.id, "QUESTION", questionDraft("Soal keenam setelah reject")),
    ).rejects.toThrow(/Kuota kontribusi soal/);

    const quota = await prisma.contributionQuota.findFirstOrThrow({
      where: { userId: student.id, type: "QUESTION" },
    });
    expect(quota.count).toBe(5);
  });

  it("menetapkan metadata soal oleh admin dan memberi reward 80% + 2 points sekali", async () => {
    const student = await registerStudent();
    const admin = await createAdmin();
    const subject = await makeSubject();
    await prisma.difficultyConfig.update({
      where: { difficulty: "EXPERT" },
      data: { bounty: 550 },
    });
    const submission = await createContributionSubmission(
      student.id,
      "QUESTION",
      questionDraft("Soal kontribusi"),
    );

    const approved = await approveContribution(admin.id, submission.id, {
      ...questionDraft("Soal kontribusi disunting admin"),
      subjectId: subject.id,
      topicId: null,
      difficulty: "EXPERT",
      bounty: 1,
      status: "DRAFT",
    });

    const question = await prisma.question.findUniqueOrThrow({ where: { id: approved.contentId } });
    expect(question).toMatchObject({
      title: "Soal kontribusi disunting admin",
      subjectId: subject.id,
      difficulty: "EXPERT",
      bounty: 550,
      status: "PUBLISHED",
      createdById: student.id,
    });
    expect(approved.coinAmount).toBe(440);
    expect(approved.pointsAmount).toBe(2);
    expect(await coins(student.id)).toBe(440);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: student.id } })).contributionPoints).toBe(2);
    expect(await prisma.walletTransaction.count({
      where: { userId: student.id, type: "CONTRIBUTION_REWARD", amount: 440 },
    })).toBe(1);
    expect(await prisma.contributionSubmission.count({ where: { id: submission.id } })).toBe(0);
    await expect(approveContribution(admin.id, submission.id)).rejects.toThrow();
    expect(await coins(student.id)).toBe(440);
  });

  it("memberi 100 Coin + 1 point untuk karakter dan mempertahankan kreator", async () => {
    const student = await registerStudent();
    const admin = await createAdmin();
    const submission = await createContributionSubmission(student.id, "CHARACTER", {
      name: "Karakter Kontributor",
      description: "Karakter buatan siswa.",
      rarity: 4,
      imageUrl: "/characters/pip-pensil.svg",
      category: "PERMANENT",
      status: "ACTIVE",
      limitedBorderType: "PRESET",
      limitedBorderConfig: null,
      limitedBorderImageUrl: null,
    });

    const approved = await approveContribution(admin.id, submission.id);
    const character = await prisma.character.findUniqueOrThrow({ where: { id: approved.contentId } });
    expect(character.createdById).toBe(student.id);
    expect(character.status).toBe("ACTIVE");
    expect(await coins(student.id)).toBe(100);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: student.id } })).contributionPoints).toBe(1);
  });

  it("menolak metadata tingkat kesulitan dari kontributor", async () => {
    const student = await registerStudent();
    await expect(
      createContributionSubmission(student.id, "QUESTION", {
        ...questionDraft("Soal tidak valid"),
        difficulty: "EXPERT",
        subjectId: "forged",
      }),
    ).rejects.toThrow();
  });
});

describe("Question deletion", () => {
  it("menghapus soal tetapi mempertahankan attempt, solve, bounty, dan paket", async () => {
    const admin = await createAdmin();
    const student = await registerStudent();
    const question = await makeMcQuestion(admin.id, { bounty: 40 });
    const pkg = await makePackage([question.id]);
    const attempt = await prisma.attempt.create({
      data: {
        userId: student.id,
        questionId: question.id,
        packageId: pkg.id,
        questionVersion: 1,
        status: "CORRECT",
        snapshot: { title: question.title, content: question.content },
        idempotencyKey: "question-delete-history",
      },
    });
    await prisma.questionSolve.create({
      data: {
        userId: student.id,
        questionId: question.id,
        attemptId: attempt.id,
        bountyAwarded: 40,
      },
    });
    await prisma.walletTransaction.create({
      data: {
        userId: student.id,
        currency: "COIN",
        amount: 40,
        balanceAfter: await coins(student.id),
        type: "QUESTION_REWARD",
        referenceType: "Question",
        referenceId: question.id,
      },
    });

    const { deleteQuestion } = await import("@/server/services/learning.service");
    await deleteQuestion(admin.id, question.id);

    const preservedAttempt = await prisma.attempt.findUniqueOrThrow({ where: { id: attempt.id } });
    const preservedSolve = await prisma.questionSolve.findUniqueOrThrow({ where: { attemptId: attempt.id } });
    const preservedPackage = await prisma.package.findUniqueOrThrow({
      where: { id: pkg.id },
      include: { items: true },
    });
    expect(preservedAttempt.questionId).toBeNull();
    expect(preservedAttempt.snapshot).toMatchObject({ title: question.title });
    expect(preservedSolve.questionId).toBeNull();
    expect(preservedSolve.bountyAwarded).toBe(40);
    expect(preservedPackage.status).toBe("PUBLISHED");
    expect(preservedPackage.items).toHaveLength(0);
    expect(await prisma.walletTransaction.count({
      where: { userId: student.id, referenceId: question.id },
    })).toBe(1);
  });
});
