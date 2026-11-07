import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { POST as attemptRoute } from "@/app/api/questions/[id]/attempts/route";
import { POST as reviewRoute } from "@/app/api/admin/reviews/[attemptId]/route";
import { POST as createQuestionRoute } from "@/app/api/admin/questions/route";
import { PUT as updateQuestionRoute } from "@/app/api/admin/questions/[id]/route";
import { POST as createPackageRoute } from "@/app/api/admin/packages/route";
import { getPackageForStudent } from "@/server/services/learning.service";
import {
  coins,
  createAdmin,
  ctx,
  makeMcQuestion,
  makePackage,
  makeShortQuestion,
  makeSubject,
  registerStudent,
  req,
  resetDb,
} from "./helpers";

beforeEach(resetDb);

const answer = (questionId: string, token: string, body: object, idempotencyKey?: string) =>
  attemptRoute(
    req(`/api/questions/${questionId}/attempts`, { token, body, idempotencyKey }),
    ctx({ id: questionId }),
  );

describe("pilihan ganda", () => {
  it("jawaban benar memberi bounty, ledger, dan status SOLVED", async () => {
    const admin = await createAdmin();
    const s = await registerStudent();
    const q = await makeMcQuestion(admin.id, { bounty: 10 });
    const pkg = await makePackage([q.id]);
    const res = await answer(q.id, s.token, { packageId: pkg.id, optionId: q.options[1]!.id });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({
      status: "CORRECT",
      bountyAwarded: 10,
      isPractice: false,
      coins: 10,
    });
    expect(body.correctOptionId).toBe(q.options[1]!.id);
    expect(await coins(s.id)).toBe(10);
    const tx = await prisma.walletTransaction.findMany({ where: { userId: s.id } });
    expect(tx).toHaveLength(1);
    expect(tx[0]).toMatchObject({
      type: "QUESTION_REWARD",
      amount: 10,
      balanceAfter: 10,
      currency: "COIN",
      referenceId: q.id,
    });
    expect(await prisma.questionSolve.count({ where: { userId: s.id, questionId: q.id } })).toBe(1);
    const view = await getPackageForStudent(s.id, pkg.id);
    expect(view.questions[0]!.status).toBe("SOLVED");
    expect(view.progress).toEqual({ solved: 1, total: 1, percent: 100 });
    expect(await prisma.packageProgress.count({ where: { userId: s.id, packageId: pkg.id } })).toBe(
      1,
    );
  });

  it("jawaban benar hanya memberi bounty sekali (latihan ulang tanpa reward)", async () => {
    const admin = await createAdmin();
    const s = await registerStudent();
    const q = await makeMcQuestion(admin.id, { bounty: 10 });
    await answer(q.id, s.token, { optionId: q.options[1]!.id });
    const again = await (await answer(q.id, s.token, { optionId: q.options[1]!.id })).json();
    expect(again).toMatchObject({ status: "CORRECT", isPractice: true, bountyAwarded: 0 });
    expect(await coins(s.id)).toBe(10);
    expect(await prisma.attempt.count({ where: { userId: s.id } })).toBe(2);
  });

  it("request ganda bersamaan hanya memberi reward sekali", async () => {
    const admin = await createAdmin();
    const s = await registerStudent();
    const q = await makeMcQuestion(admin.id, { bounty: 10 });
    const results = await Promise.all(
      Array.from({ length: 5 }, () => answer(q.id, s.token, { optionId: q.options[1]!.id })),
    );
    expect(results.every((r) => r.status === 201)).toBe(true);
    expect(await coins(s.id)).toBe(10);
    expect(await prisma.questionSolve.count()).toBe(1);
    expect(await prisma.walletTransaction.count({ where: { type: "QUESTION_REWARD" } })).toBe(1);
  });

  it("retry dengan Idempotency-Key sama tidak membuat attempt baru", async () => {
    const admin = await createAdmin();
    const s = await registerStudent();
    const q = await makeMcQuestion(admin.id);
    const key = "retry-key-12345";
    const first = await answer(q.id, s.token, { optionId: q.options[1]!.id }, key);
    const second = await answer(q.id, s.token, { optionId: q.options[1]!.id }, key);
    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect((await second.json()).replayed).toBe(true);
    expect(await prisma.attempt.count()).toBe(1);
    expect(await coins(s.id)).toBe(10);
  });

  it("jawaban salah tidak memberi bounty dan tidak membocorkan kunci", async () => {
    const admin = await createAdmin();
    const s = await registerStudent();
    const q = await makeMcQuestion(admin.id);
    const pkg = await makePackage([q.id]);
    const body = await (
      await answer(q.id, s.token, { packageId: pkg.id, optionId: q.options[0]!.id })
    ).json();
    expect(body).toMatchObject({
      status: "INCORRECT",
      bountyAwarded: 0,
      correctOptionId: null,
      explanation: null,
    });
    expect(await coins(s.id)).toBe(0);
    expect(await prisma.walletTransaction.count()).toBe(0);
    const view = await getPackageForStudent(s.id, pkg.id);
    expect(view.questions[0]!.status).toBe("ATTEMPTED");
    expect(view.questions[0]!.correctOptionId).toBeNull();
    expect(JSON.stringify(view)).not.toContain("isCorrect");
    // Boleh mencoba lagi selama belum solved
    const retry = await (await answer(q.id, s.token, { optionId: q.options[1]!.id })).json();
    expect(retry.bountyAwarded).toBe(10);
  });

  it("soal yang sama di dua paket hanya memberi reward sekali", async () => {
    const admin = await createAdmin();
    const s = await registerStudent();
    const q = await makeMcQuestion(admin.id, { bounty: 10 });
    const p1 = await makePackage([q.id], "P1");
    const p2 = await makePackage([q.id], "P2");
    await answer(q.id, s.token, { packageId: p1.id, optionId: q.options[1]!.id });
    const second = await (
      await answer(q.id, s.token, { packageId: p2.id, optionId: q.options[1]!.id })
    ).json();
    expect(second.bountyAwarded).toBe(0);
    expect(await coins(s.id)).toBe(10);
    expect((await getPackageForStudent(s.id, p2.id)).progress.solved).toBe(1);
  });

  it("soal draft dan opsi milik soal lain ditolak", async () => {
    const admin = await createAdmin();
    const s = await registerStudent();
    const draft = await makeMcQuestion(admin.id, { status: "DRAFT" });
    expect((await answer(draft.id, s.token, { optionId: draft.options[1]!.id })).status).toBe(404);
    const q = await makeMcQuestion(admin.id);
    expect((await answer(q.id, s.token, { optionId: draft.options[1]!.id })).status).toBe(400);
  });

  it("tanpa Idempotency-Key ditolak", async () => {
    const admin = await createAdmin();
    const s = await registerStudent();
    const q = await makeMcQuestion(admin.id);
    const res = await attemptRoute(
      req(`/api/questions/${q.id}/attempts`, {
        token: s.token,
        body: { optionId: q.options[1]!.id },
        idempotencyKey: null,
      }),
      ctx({ id: q.id }),
    );
    expect(res.status).toBe(400);
  });

  it("perubahan bounty setelah solved tidak memberi reward tambahan; versi & snapshot tersimpan", async () => {
    const admin = await createAdmin();
    const s = await registerStudent();
    const q = await makeMcQuestion(admin.id, { bounty: 10 });
    await answer(q.id, s.token, { optionId: q.options[1]!.id });
    const res = await updateQuestionRoute(
      req(`/api/admin/questions/${q.id}`, {
        method: "PUT",
        token: admin.token,
        body: {
          subjectId: q.subjectId,
          title: "Soal PG (revisi)",
          content: "2 + 3 = ?",
          type: "MULTIPLE_CHOICE",
          difficulty: "HARD",
          bounty: 100,
          status: "PUBLISHED",
          options: [
            { text: "5", isCorrect: true },
            { text: "6", isCorrect: false },
          ],
        },
      }),
      ctx({ id: q.id }),
    );
    expect(res.status).toBe(200);
    const updated = await prisma.question.findUniqueOrThrow({
      where: { id: q.id },
      include: { options: true },
    });
    expect(updated.version).toBe(2);
    const newCorrect = updated.options.find((o) => o.isCorrect)!;
    await answer(q.id, s.token, { optionId: newCorrect.id });
    expect(await coins(s.id)).toBe(10);
    const first = await prisma.attempt.findFirstOrThrow({
      where: { userId: s.id },
      orderBy: { createdAt: "asc" },
    });
    expect(first.questionVersion).toBe(1);
    expect(first.snapshot).toMatchObject({ content: "2 + 2 = ?", selectedOptionText: "4" });
  });
});

describe("isian & review admin", () => {
  it("jawaban isian masuk PENDING_REVIEW tanpa reward dan tanpa jawaban acuan", async () => {
    const admin = await createAdmin();
    const s = await registerStudent();
    const q = await makeShortQuestion(admin.id);
    const body = await (await answer(q.id, s.token, { answerText: "Jantung" })).json();
    expect(body).toMatchObject({ status: "PENDING_REVIEW", bountyAwarded: 0, acceptedAnswers: [] });
    expect(await coins(s.id)).toBe(0);
    const dup = await answer(q.id, s.token, { answerText: "jantung lagi" });
    expect(dup.status).toBe(409);
  });

  it("admin approve memberi reward tepat sekali + audit log", async () => {
    const admin = await createAdmin();
    const s = await registerStudent();
    const q = await makeShortQuestion(admin.id, 20);
    const { attemptId } = await (await answer(q.id, s.token, { answerText: "jantung" })).json();
    const review = () =>
      reviewRoute(
        req(`/api/admin/reviews/${attemptId}`, {
          token: admin.token,
          body: { decision: "APPROVE", feedback: "Bagus!" },
        }),
        ctx({ attemptId }),
      );
    const [r1, r2] = await Promise.all([review(), review()]);
    expect([r1.status, r2.status].sort()).toEqual([200, 409]);
    expect(await coins(s.id)).toBe(20);
    expect(await prisma.walletTransaction.count({ where: { type: "QUESTION_REWARD" } })).toBe(1);
    const a = await prisma.attempt.findUniqueOrThrow({ where: { id: attemptId } });
    expect(a).toMatchObject({ status: "APPROVED", reviewedById: admin.id, feedback: "Bagus!" });
    expect(a.reviewedAt).toBeInstanceOf(Date);
    expect(
      await prisma.auditLog.count({ where: { action: "REVIEW_APPROVE", targetId: attemptId } }),
    ).toBe(1);
  });

  it("admin reject tidak memberi reward dan siswa dapat mengirim ulang", async () => {
    const admin = await createAdmin();
    const s = await registerStudent();
    const q = await makeShortQuestion(admin.id, 20);
    const { attemptId } = await (await answer(q.id, s.token, { answerText: "paru-paru" })).json();
    const res = await reviewRoute(
      req(`/api/admin/reviews/${attemptId}`, {
        token: admin.token,
        body: { decision: "REJECT", feedback: "Coba lagi" },
      }),
      ctx({ attemptId }),
    );
    expect(res.status).toBe(200);
    expect(await coins(s.id)).toBe(0);
    expect(await prisma.questionSolve.count()).toBe(0);
    const again = await answer(q.id, s.token, { answerText: "jantung" });
    expect(again.status).toBe(201);
    expect((await again.json()).status).toBe("PENDING_REVIEW");
  });
});

describe("admin membuat soal dan paket", () => {
  it("validasi tepat satu jawaban benar dan paket tanpa duplikat", async () => {
    const admin = await createAdmin();
    const subject = await makeSubject();
    const bad = await createQuestionRoute(
      req("/api/admin/questions", {
        token: admin.token,
        body: {
          subjectId: subject.id,
          title: "Soal",
          content: "Isi soal",
          type: "MULTIPLE_CHOICE",
          difficulty: "EASY",
          options: [
            { text: "a", isCorrect: true },
            { text: "b", isCorrect: true },
          ],
        },
      }),
    );
    expect(bad.status).toBe(400);
    const ok = await createQuestionRoute(
      req("/api/admin/questions", {
        token: admin.token,
        body: {
          subjectId: subject.id,
          title: "Soal",
          content: "Isi soal",
          type: "MULTIPLE_CHOICE",
          difficulty: "EXPERT",
          status: "PUBLISHED",
          options: [
            { text: "a", isCorrect: true },
            { text: "b", isCorrect: false },
          ],
        },
      }),
    );
    expect(ok.status).toBe(201);
    const { question } = await ok.json();
    expect(question.bounty).toBe(35); // default dari konfigurasi EXPERT
    const dup = await createPackageRoute(
      req("/api/admin/packages", {
        token: admin.token,
        body: { title: "Paket A", questionIds: [question.id, question.id] },
      }),
    );
    expect(dup.status).toBe(400);
    const pkg = await createPackageRoute(
      req("/api/admin/packages", {
        token: admin.token,
        body: { title: "Paket A", questionIds: [question.id], status: "PUBLISHED" },
      }),
    );
    expect(pkg.status).toBe(201);
    expect(
      await prisma.auditLog.count({
        where: { action: { in: ["QUESTION_CREATE", "PACKAGE_CREATE"] } },
      }),
    ).toBe(2);
  });
});
