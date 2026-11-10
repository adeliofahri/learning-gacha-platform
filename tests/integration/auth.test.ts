import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import {
  POST as createQuestionRoute,
  GET as listQuestionsRoute,
} from "@/app/api/admin/questions/route";
import { POST as adjustRoute } from "@/app/api/admin/users/[id]/adjust/route";
import { POST as reviewRoute } from "@/app/api/admin/reviews/[attemptId]/route";
import { POST as bannerRoute } from "@/app/api/admin/banners/route";
import { PUT as settingsRoute } from "@/app/api/admin/settings/route";
import { PATCH as userStatusRoute } from "@/app/api/admin/users/[id]/route";
import { POST as pullRoute } from "@/app/api/gacha/[bannerId]/pull/route";
import { getUserByToken } from "@/lib/auth/session";
import { createAdmin, ctx, registerStudent, req, resetDb, tokenFrom } from "./helpers";
import { randomBytes } from "node:crypto";
import { hashToken } from "@/lib/auth/session";
import { POST as verifyEmailRoute } from "@/app/api/auth/verify-email/route";

beforeEach(resetDb);

describe("register & login", () => {
  it("siswa dapat register tanpa sesi, wallet dibuat, dan password ter-hash", async () => {
    const res = await register(
      req("/api/auth/register", {
        body: {
          username: "budi_01",
          email: "Budi@Test.local",
          password: "Rahasia123",
        },
      }),
    );

    expect(res.status).toBe(201);

    // Registrasi belum membuat sesi.
    expect(res.headers.get("set-cookie")).toBeNull();

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: "budi@test.local" },
      include: {
        wallet: true,
        emailVerificationTokens: true,
      },
    });

    expect(user.role).toBe("STUDENT");
    expect(user.status).toBe("PENDING_VERIFICATION");
    expect(user.emailVerifiedAt).toBeNull();
    expect(user.isPublic).toBe(false);

    expect(user.passwordHash).not.toContain("Rahasia123");
    expect(user.passwordHash.startsWith("$argon2id$")).toBe(true);

    expect(user.wallet?.coins).toBe(0);

    // Token verifikasi harus tersimpan dalam bentuk hash.
    expect(user.emailVerificationTokens).toHaveLength(1);
    expect(user.emailVerificationTokens[0]!.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("tidak bisa membuat admin lewat registrasi publik", async () => {
    const res = await register(
      req("/api/auth/register", {
        body: { username: "hacker", email: "h@test.local", password: "Rahasia123", role: "ADMIN" },
      }),
    );
    expect(res.status).toBe(400);
    expect(await prisma.user.count({ where: { role: "ADMIN" } })).toBe(0);
  });

  it("username/email duplikat ditolak", async () => {
    const body = { username: "dup_user", email: "dup@test.local", password: "Rahasia123" };
    expect((await register(req("/api/auth/register", { body }))).status).toBe(201);
    expect((await register(req("/api/auth/register", { body }))).status).toBe(409);
  });

  it("siswa harus verifikasi email sebelum login; password salah ditolak dan logout menghapus sesi", async () => {
    await register(
      req("/api/auth/register", {
        body: {
          username: "sari",
          email: "sari@test.local",
          password: "Rahasia123",
        },
      }),
    );

    // Akun yang belum diverifikasi tidak boleh login.
    const pendingLogin = await login(
      req("/api/auth/login", {
        body: {
          email: "sari@test.local",
          password: "Rahasia123",
        },
      }),
    );

    expect(pendingLogin.status).toBe(403);

    // Simulasikan token yang dikirim melalui email.
    const verificationToken = randomBytes(32).toString("base64url");

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: "sari@test.local" },
    });

    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(verificationToken),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    // Verifikasi melalui endpoint sebenarnya.
    const verification = await verifyEmailRoute(
      req("/api/auth/verify-email", {
        body: { token: verificationToken },
      }),
    );

    expect(verification.status).toBe(200);

    const verifiedUser = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });

    expect(verifiedUser.status).toBe("ACTIVE");
    expect(verifiedUser.emailVerifiedAt).not.toBeNull();

    // Password salah tetap ditolak.
    const bad = await login(
      req("/api/auth/login", {
        body: {
          email: "sari@test.local",
          password: "salah12345",
        },
      }),
    );

    expect(bad.status).toBe(401);

    // Login berhasil setelah verifikasi.
    const ok = await login(
      req("/api/auth/login", {
        body: {
          email: "sari@test.local",
          password: "Rahasia123",
        },
      }),
    );

    expect(ok.status).toBe(200);

    const token = tokenFrom(ok);
    expect(await getUserByToken(token)).not.toBeNull();

    // Logout menghapus sesi.
    await logout(req("/api/auth/logout", { token, body: {} }));

    expect(await getUserByToken(token)).toBeNull();
  });

  it("rate limiting login per email", async () => {
    const statuses: number[] = [];

    for (let i = 0; i < 17; i++) {
      const res = await login(
        req("/api/auth/login", {
          body: {
            email: "target@test.local",
            password: "x",
          },
        }),
      );

      statuses.push(res.status);
    }

    expect(statuses.slice(0, 15).every((s) => s === 401)).toBe(true);
    expect(statuses.slice(15).every((s) => s === 429)).toBe(true);
  });

  it("akun SUSPENDED tidak bisa login dan sesinya dicabut", async () => {
    const admin = await createAdmin();
    const s = await registerStudent();
    const res = await userStatusRoute(
      req(`/api/admin/users/${s.id}`, {
        method: "PATCH",
        token: admin.token,
        body: { status: "SUSPENDED" },
      }),
      ctx({ id: s.id }),
    );
    expect(res.status).toBe(200);
    expect(await getUserByToken(s.token)).toBeNull();
    const again = await login(
      req("/api/auth/login", {
        body: { email: `${s.username}@test.local`, password: "Password123" },
      }),
    );
    expect(again.status).toBe(403);
  });
});

describe("otorisasi admin", () => {
  it("siswa tidak bisa mengakses endpoint admin (403) dan tidak ada perubahan data", async () => {
    const s = await registerStudent();
    const calls: [string, Promise<Response>][] = [
      ["list questions", listQuestionsRoute(req("/api/admin/questions", { token: s.token }))],
      [
        "create question",
        createQuestionRoute(req("/api/admin/questions", { token: s.token, body: {} })),
      ],
      [
        "adjust",
        adjustRoute(
          req(`/api/admin/users/${s.id}/adjust`, {
            token: s.token,
            body: { amount: 9999, reason: "curang sekali" },
          }),
          ctx({ id: s.id }),
        ),
      ],
      [
        "review",
        reviewRoute(
          req("/api/admin/reviews/x", { token: s.token, body: { decision: "APPROVE" } }),
          ctx({ attemptId: "x" }),
        ),
      ],
      ["banner", bannerRoute(req("/api/admin/banners", { token: s.token, body: {} }))],
      [
        "settings",
        settingsRoute(req("/api/admin/settings", { method: "PUT", token: s.token, body: {} })),
      ],
    ];
    for (const [name, p] of calls) {
      const res = await p;
      expect(res.status, name).toBe(403);
    }
    expect((await prisma.wallet.findUniqueOrThrow({ where: { userId: s.id } })).coins).toBe(0);
    expect(await prisma.walletTransaction.count()).toBe(0);
  });

  it("tanpa login → 401", async () => {
    const res = await listQuestionsRoute(req("/api/admin/questions"));
    expect(res.status).toBe(401);
  });

  it("admin tidak bisa memakai endpoint siswa (gacha)", async () => {
    const admin = await createAdmin();
    const res = await pullRoute(
      req("/api/gacha/x/pull", { token: admin.token, body: { type: "SINGLE" } }),
      ctx({ bannerId: "x" }),
    );
    expect(res.status).toBe(403);
  });
});
