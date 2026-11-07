import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { registerSchema } from "@/lib/validation/auth";
import { validateImage } from "@/server/services/upload.service";
import { characterSchema } from "@/lib/validation/collection";
import { requireAdmin, requireStudent } from "@/server/policies";

describe("CSRF middleware", () => {
  const make = (origin?: string) =>
    new NextRequest("http://localhost:3000/api/gacha/x/pull", {
      method: "POST",
      headers: { host: "localhost:3000", ...(origin ? { origin } : {}) },
    });
  it("menerima origin yang sama", () => {
    expect(middleware(make("http://localhost:3000")).status).toBe(200);
  });
  it("menolak origin lain atau tanpa origin", () => {
    expect(middleware(make("https://evil.example")).status).toBe(403);
    expect(middleware(make()).status).toBe(403);
  });
  it("GET tidak diblokir", () => {
    expect(middleware(new NextRequest("http://localhost:3000/api/leaderboard")).status).toBe(200);
  });
});

describe("registrasi tidak bisa membuat admin", () => {
  it("field role ditolak skema strict", () => {
    const r = registerSchema.safeParse({
      username: "abc",
      email: "a@b.co",
      password: "Password1",
      role: "ADMIN",
    });
    expect(r.success).toBe(false);
  });
});

describe("RBAC policy", () => {
  const student = {
    id: "1",
    username: "s",
    email: "s@x",
    role: "STUDENT" as const,
    status: "ACTIVE" as const,
  };
  const admin = { ...student, role: "ADMIN" as const };
  it("student ditolak di admin", () => expect(() => requireAdmin(student)).toThrow(/admin/));
  it("tanpa login ditolak", () => expect(() => requireStudent(null)).toThrow());
  it("admin lolos", () => expect(requireAdmin(admin)).toBe(admin));
});

describe("validasi upload", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  it("menerima PNG asli", () =>
    expect(validateImage({ type: "image/png", size: png.length }, png)).toBe("png"));
  it("menolak magic bytes palsu", () => {
    expect(() => validateImage({ type: "image/png", size: 5 }, Buffer.from("<svg>"))).toThrow();
  });
  it("menolak SVG dan file terlalu besar", () => {
    expect(() =>
      validateImage({ type: "image/svg+xml", size: 10 }, Buffer.from("<svg></svg>")),
    ).toThrow();
    expect(() => validateImage({ type: "image/png", size: 3 * 1024 * 1024 }, png)).toThrow();
  });
  it("path gambar karakter harus lokal", () => {
    const base = { name: "Xena", rarity: 3, category: "PERMANENT" };
    expect(
      characterSchema.safeParse({ ...base, imageUrl: "https://evil.example/a.png" }).success,
    ).toBe(false);
    expect(
      characterSchema.safeParse({ ...base, imageUrl: "/characters/../../etc.png" }).success,
    ).toBe(false);
    expect(characterSchema.safeParse({ ...base, imageUrl: "/characters/a.svg" }).success).toBe(
      true,
    );
  });
});

describe("redirect halaman terproteksi", () => {
  it("tanpa cookie sesi → redirect /login", () => {
    const res = middleware(new NextRequest("http://localhost:3000/admin/users"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });
  it("dengan cookie → diteruskan (validasi penuh di server)", () => {
    const req = new NextRequest("http://localhost:3000/dashboard", {
      headers: { cookie: "lgp_session=abc" },
    });
    expect(middleware(req).status).toBe(200);
  });
});
