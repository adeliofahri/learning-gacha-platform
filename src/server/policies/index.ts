import type { SessionUser } from "@/lib/auth/session";
import { forbidden, unauthorized } from "@/lib/errors";

export function requireUser(user: SessionUser | null): SessionUser {
  if (!user) throw unauthorized();
  return user;
}

export function requireStudent(user: SessionUser | null): SessionUser {
  const u = requireUser(user);
  if (u.role !== "STUDENT") throw forbidden("Fitur ini hanya untuk siswa");
  return u;
}

export function requireAdmin(user: SessionUser | null): SessionUser {
  const u = requireUser(user);
  if (u.role !== "ADMIN") throw forbidden("Hanya admin yang dapat mengakses fitur ini");
  return u;
}

/** Pencegahan IDOR: hanya pemilik resource atau admin. */
export function assertOwnerOrAdmin(user: SessionUser, ownerId: string): void {
  if (user.role !== "ADMIN" && user.id !== ownerId) throw forbidden();
}
