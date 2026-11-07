import { prisma, transaction, isUniqueViolation } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { burnPasswordCheck, hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import type { LoginInput, RegisterInput } from "@/lib/validation/auth";

/** Registrasi publik SELALU membuat STUDENT. Tidak ada jalur publik untuk ADMIN. */
export async function registerStudent(input: RegisterInput) {
  const passwordHash = await hashPassword(input.password);
  try {
    const user = await transaction(async (tx) => {
      const created = await tx.user.create({
        data: { username: input.username, email: input.email, passwordHash, role: "STUDENT" },
        select: { id: true, username: true, role: true },
      });
      await tx.wallet.create({ data: { userId: created.id } });
      return created;
    });
    const session = await createSession(user.id);
    return { user, session };
  } catch (error) {
    if (isUniqueViolation(error))
      throw new AppError("CONFLICT", "Username atau email sudah terdaftar");
    throw error;
  }
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, username: true, role: true, status: true, passwordHash: true },
  });
  if (!user) {
    await burnPasswordCheck(input.password);
    throw new AppError("UNAUTHORIZED", "Email atau password salah");
  }
  const ok = await verifyPassword(user.passwordHash, input.password);
  if (!ok) throw new AppError("UNAUTHORIZED", "Email atau password salah");
  if (user.status !== "ACTIVE")
    throw new AppError("FORBIDDEN", "Akun dinonaktifkan. Hubungi admin.");
  const session = await createSession(user.id);
  return { user: { id: user.id, username: user.username, role: user.role }, session };
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
