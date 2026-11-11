import { prisma, transaction, isUniqueViolation } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { burnPasswordCheck, hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, hashToken } from "@/lib/auth/session";
import type { LoginInput, RegisterInput } from "@/lib/validation/auth";
import { randomBytes } from "node:crypto";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "@/server/services/email.service";

/** Registrasi publik SELALU membuat STUDENT. */
export async function registerStudent(input: RegisterInput) {
  const passwordHash = await hashPassword(input.password);
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  try {
    const user = await transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username: input.username,
          email: input.email,
          passwordHash,
          role: "STUDENT",
          status: "PENDING_VERIFICATION",
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
        },
      });

      await tx.wallet.create({
        data: { userId: created.id },
      });

      await tx.emailVerificationToken.create({
        data: {
          userId: created.id,
          tokenHash,
          expiresAt,
        },
      });

      return created;
    });

    let emailSent = true;

    try {
      await sendVerificationEmail({
        to: user.email,
        token,
      });
    } catch (error) {
      emailSent = false;
      console.error("[auth] Verification email could not be sent:", error);
    }

    return { user, emailSent };
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError("CONFLICT", "Username atau email sudah terdaftar");
    }

    throw error;
  }
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      username: true,
      role: true,
      status: true,
      passwordHash: true,
    },
  });

  if (!user) {
    await burnPasswordCheck(input.password);
    throw new AppError("UNAUTHORIZED", "Email atau password salah");
  }

  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok) throw new AppError("UNAUTHORIZED", "Email atau password salah");

  if (user.status === "PENDING_VERIFICATION") {
    throw new AppError(
      "FORBIDDEN",
      "Email belum diverifikasi. Silakan periksa inbox atau kirim ulang email verifikasi.",
    );
  }

  if (user.status !== "ACTIVE") {
    throw new AppError("FORBIDDEN", "Akun dinonaktifkan. Hubungi admin.");
  }

  const session = await createSession(user.id);

  return {
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    session,
  };
}

/**
 * Memverifikasi email menggunakan token sekali pakai.
 */
export async function verifyEmail(token: string) {
  const tokenHash = hashToken(token);
  const now = new Date();

  await transaction(async (tx) => {
    const verification = await tx.emailVerificationToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        user: {
          select: {
            status: true,
          },
        },
      },
    });

    if (
      !verification ||
      verification.usedAt ||
      verification.expiresAt <= now ||
      verification.user.status !== "PENDING_VERIFICATION"
    ) {
      throw new AppError(
        "BAD_REQUEST",
        "Tautan verifikasi tidak valid atau sudah kedaluwarsa.",
      );
    }

    const consumed = await tx.emailVerificationToken.updateMany({
      where: {
        id: verification.id,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });

    if (consumed.count !== 1) {
      throw new AppError(
        "BAD_REQUEST",
        "Tautan verifikasi tidak valid atau sudah digunakan.",
      );
    }

    const activated = await tx.user.updateMany({
      where: {
        id: verification.userId,
        status: "PENDING_VERIFICATION",
      },
      data: {
        status: "ACTIVE",
        emailVerifiedAt: now,
      },
    });

    if (activated.count !== 1) {
      throw new AppError(
        "BAD_REQUEST",
        "Akun tidak dapat diverifikasi.",
      );
    }

    await tx.emailVerificationToken.updateMany({
      where: {
        userId: verification.userId,
        usedAt: null,
      },
      data: { usedAt: now },
    });
  });
}

/**
 * Mengirim ulang email verifikasi.
 * Akun yang tidak ditemukan atau tidak lagi menunggu verifikasi
 * tidak menghasilkan email.
 */
export async function resendVerificationEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      status: true,
    },
  });

  if (!user || user.status !== "PENDING_VERIFICATION") {
    return;
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

  await transaction(async (tx) => {
    await tx.emailVerificationToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: { usedAt: now },
    });

    await tx.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });
  });

  try {
    await sendVerificationEmail({
      to: user.email,
      token,
    });
  } catch (error) {
    console.error("[auth] Resend verification email failed:", error);
  }
}

/** Pembuatan admin hanya lewat seed / CLI lokal (scripts/create-admin.ts). */
export async function createAdminAccount(input: {
  username: string;
  email: string;
  password: string;
}) {
  const passwordHash = await hashPassword(input.password);
  return prisma.user.upsert({
    where: { email: input.email },
    create: { username: input.username, email: input.email, passwordHash, role: "ADMIN" },
    update: { passwordHash, role: "ADMIN", status: "ACTIVE" },
    select: { id: true, username: true, email: true, role: true },
  });
}

/**
 * Ganti password (siswa & admin). Wajib password lama. Semua sesi lain dicabut,
 * sesi yang sedang dipakai tetap aktif.
 */
export async function changePassword(params: {
  userId: string;
  currentToken: string;
  currentPassword: string;
  newPassword: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, role: true, passwordHash: true },
  });
  if (!user) throw new AppError("NOT_FOUND", "User tidak ditemukan");
  if (!(await verifyPassword(user.passwordHash, params.currentPassword))) {
    throw new AppError("BAD_REQUEST", "Password lama salah");
  }
  const passwordHash = await hashPassword(params.newPassword);
  await transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    await tx.session.deleteMany({
      where: { userId: user.id, NOT: { tokenHash: hashToken(params.currentToken) } },
    });
    if (user.role === "ADMIN") {
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "PASSWORD_CHANGE",
          targetType: "User",
          targetId: user.id,
        },
      });
    }
  });
}


/**
 * Meminta reset password melalui email.
 * Respons tidak membedakan email terdaftar dan tidak terdaftar.
 */
export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findFirst({
    where: {
      email,
      status: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
    },
  });

  if (!user) {
    return;
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

  await transaction(async (tx) => {
    // Membatalkan token reset sebelumnya yang belum digunakan.
    await tx.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: { usedAt: now },
    });

    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });
  });

  try {
    await sendPasswordResetEmail({
      to: user.email,
      token,
    });
  } catch (error) {
    // Token tidak boleh tetap aktif jika email gagal dikirim.
    await prisma.passwordResetToken.updateMany({
      where: {
        tokenHash,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    console.error("[auth] Password reset email could not be sent:", error);
  }
}

/**
 * Mengatur ulang password menggunakan token sekali pakai.
 * Seluruh sesi pengguna dicabut setelah reset berhasil.
 */
export async function resetPassword(params: {
  token: string;
  newPassword: string;
}) {
  const tokenHash = hashToken(params.token);
  const now = new Date();

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt <= now
  ) {
    throw new AppError(
      "BAD_REQUEST",
      "Tautan reset password tidak valid atau sudah kedaluwarsa.",
    );
  }

  const passwordHash = await hashPassword(params.newPassword);

  await transaction(async (tx) => {
    // Atomic check untuk mencegah token digunakan lebih dari sekali.
    const consumed = await tx.passwordResetToken.updateMany({
      where: {
        id: resetToken.id,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });

    if (consumed.count !== 1) {
      throw new AppError(
        "BAD_REQUEST",
        "Tautan reset password tidak valid atau sudah digunakan.",
      );
    }

    await tx.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    });

    // Cabut seluruh sesi, termasuk sesi yang mungkin masih aktif.
    await tx.session.deleteMany({
      where: { userId: resetToken.userId },
    });

    // Batalkan semua token reset lain yang masih aktif.
    await tx.passwordResetToken.updateMany({
      where: {
        userId: resetToken.userId,
        usedAt: null,
      },
      data: { usedAt: now },
    });
  });
}
