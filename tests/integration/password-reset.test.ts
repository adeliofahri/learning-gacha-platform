
import { beforeEach, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashToken, getUserByToken } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { POST as resetPasswordRoute } from "@/app/api/auth/reset-password/route";
import {
  createAdmin,
  registerStudent,
  req,
  resetDb,
} from "./helpers";
import { POST as forgotPasswordRoute } from "@/app/api/auth/forgot-password/route";
import { POST as registerRoute } from "@/app/api/auth/register/route";

beforeEach(resetDb);

async function createResetToken(
  userId: string,
  expiresAt = new Date(Date.now() + 30 * 60 * 1000),
) {
  const token = randomBytes(32).toString("base64url");

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  return token;
}

describe("password reset", () => {
  it("token valid dapat mengubah password dan mencabut seluruh sesi", async () => {
    const student = await registerStudent();
    const secondSession = await prisma.session.create({
      data: {
        userId: student.id,
        tokenHash: hashToken(randomBytes(32).toString("base64url")),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const token = await createResetToken(student.id);
    const newPassword = "PasswordBaru123";

    const response = await resetPasswordRoute(
      req("/api/auth/reset-password", {
        body: { token, newPassword },
      }),
    );

    expect(response.status).toBe(200);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: student.id },
    });

    expect(await verifyPassword(user.passwordHash, newPassword)).toBe(true);
    expect(await verifyPassword(user.passwordHash, "Password123")).toBe(false);

    expect(
      await prisma.session.count({
        where: { userId: student.id },
      }),
    ).toBe(0);

    const resetToken = await prisma.passwordResetToken.findFirst({
    where: { userId: student.id },
    });

    expect(resetToken).not.toBeNull();
    expect(resetToken?.usedAt).not.toBeNull();

    expect(secondSession.id).toBeTruthy();
    expect(await getUserByToken(student.token)).toBeNull();
  });

  it("token yang sudah digunakan tidak dapat digunakan kembali", async () => {
    const student = await registerStudent();
    const token = await createResetToken(student.id);

    const first = await resetPasswordRoute(
      req("/api/auth/reset-password", {
        body: { token, newPassword: "PasswordBaru123" },
      }),
    );

    expect(first.status).toBe(200);

    const second = await resetPasswordRoute(
      req("/api/auth/reset-password", {
        body: { token, newPassword: "PasswordLain123" },
      }),
    );

    expect(second.status).toBe(400);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: student.id },
    });

    expect(await verifyPassword(user.passwordHash, "PasswordBaru123")).toBe(true);
    expect(await verifyPassword(user.passwordHash, "PasswordLain123")).toBe(false);
  });

  it("token kedaluwarsa ditolak", async () => {
    const student = await registerStudent();
    const token = await createResetToken(
      student.id,
      new Date(Date.now() - 60 * 1000),
    );

    const response = await resetPasswordRoute(
      req("/api/auth/reset-password", {
        body: { token, newPassword: "PasswordBaru123" },
      }),
    );

    expect(response.status).toBe(400);

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: student.id },
    });

    expect(await verifyPassword(user.passwordHash, "Password123")).toBe(true);
  });

  it("reset password membatalkan token reset lain yang masih aktif", async () => {
    const student = await registerStudent();
    const firstToken = await createResetToken(student.id);
    const secondToken = await createResetToken(student.id);

    const response = await resetPasswordRoute(
      req("/api/auth/reset-password", {
        body: {
          token: firstToken,
          newPassword: "PasswordBaru123",
        },
      }),
    );

    expect(response.status).toBe(200);

    const tokens = await prisma.passwordResetToken.findMany({
      where: { userId: student.id },
    });

    expect(tokens).toHaveLength(2);
    expect(tokens.every((item) => item.usedAt !== null)).toBe(true);

    const secondResponse = await resetPasswordRoute(
      req("/api/auth/reset-password", {
        body: {
          token: secondToken,
          newPassword: "PasswordLain123",
        },
      }),
    );

    expect(secondResponse.status).toBe(400);
  });

    it("akun PENDING_VERIFICATION tidak mendapatkan token reset", async () => {
    const email = "pending@test.local";

    const registerResponse = await registerRoute(
        req("/api/auth/register", {
        body: {
            username: "pendinguser",
            email,
            password: "Password123",
        },
        }),
    );

    expect(registerResponse.status).toBe(201);

    const user = await prisma.user.findUniqueOrThrow({
        where: { email },
    });

    expect(user.status).toBe("PENDING_VERIFICATION");

    const response = await forgotPasswordRoute(
        req("/api/auth/forgot-password", {
        body: { email },
        ip: "10.10.10.10",
        }),
    );

    expect(response.status).toBe(200);

    const resetTokens = await prisma.passwordResetToken.count({
        where: { userId: user.id },
    });

    expect(resetTokens).toBe(0);
    });

});
