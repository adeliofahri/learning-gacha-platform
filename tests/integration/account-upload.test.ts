import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { POST as passwordRoute } from "@/app/api/account/password/route";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as uploadRoute } from "@/app/api/admin/uploads/route";
import { GET as serveUpload } from "@/app/uploads/characters/[file]/route";
import { createSession, getUserByToken } from "@/lib/auth/session";
import { createAdmin, ctx, registerStudent, req, resetDb } from "./helpers";

beforeEach(resetDb);

describe("ganti password", () => {
  it("wajib password lama benar; sesi lain dicabut, sesi aktif tetap", async () => {
    const s = await registerStudent();
    const other = await createSession(s.id);
    const wrong = await passwordRoute(
      req("/api/account/password", {
        token: s.token,
        body: { currentPassword: "salah", newPassword: "BaruSekali123" },
      }),
    );
    expect(wrong.status).toBe(400);
    const ok = await passwordRoute(
      req("/api/account/password", {
        token: s.token,
        body: { currentPassword: "Password123", newPassword: "BaruSekali123" },
      }),
    );
    expect(ok.status).toBe(200);
    expect(await getUserByToken(s.token)).not.toBeNull();
    expect(await getUserByToken(other.token)).toBeNull();
    const email = `${s.username}@test.local`;
    expect(
      (await loginRoute(req("/api/auth/login", { body: { email, password: "Password123" } })))
        .status,
    ).toBe(401);
    expect(
      (await loginRoute(req("/api/auth/login", { body: { email, password: "BaruSekali123" } })))
        .status,
    ).toBe(200);
  });

  it("tanpa login ditolak; password baru lemah ditolak", async () => {
    const res = await passwordRoute(
      req("/api/account/password", {
        body: { currentPassword: "a", newPassword: "BaruSekali123" },
      }),
    );
    expect(res.status).toBe(401);
    const admin = await createAdmin();
    const weak = await passwordRoute(
      req("/api/account/password", {
        token: admin.token,
        body: { currentPassword: "AdminPass123", newPassword: "pendek" },
      }),
    );
    expect(weak.status).toBe(400);
  });
});

describe("upload gambar disimpan di database", () => {
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    Buffer.alloc(32, 1),
  ]);
  const uploadReq = (token: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return new Request("http://localhost:3000/api/admin/uploads", {
      method: "POST",
      headers: { cookie: `lgp_session=${token}` },
      body: fd,
    });
  };

  it("admin upload PNG → tersimpan di DB → bisa diambil kembali dengan byte yang sama", async () => {
    const admin = await createAdmin();
    const res = await uploadRoute(
      uploadReq(admin.token, new File([png], "a.png", { type: "image/png" })),
    );
    expect(res.status).toBe(201);
    const { url } = (await res.json()) as { url: string };
    const filename = url.split("/").pop()!;
    expect(await prisma.uploadedImage.count({ where: { filename } })).toBe(1);
    const served = await serveUpload(
      new Request(`http://localhost:3000${url}`),
      ctx({ file: filename }),
    );
    expect(served.status).toBe(200);
    expect(served.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await served.arrayBuffer()).equals(png)).toBe(true);
  });

  it("siswa tidak bisa upload; file palsu ditolak; nama file aneh 404", async () => {
    const s = await registerStudent();
    expect(
      (await uploadRoute(uploadReq(s.token, new File([png], "a.png", { type: "image/png" }))))
        .status,
    ).toBe(403);
    const admin = await createAdmin();
    const fake = await uploadRoute(
      uploadReq(admin.token, new File(["<svg/>"], "a.png", { type: "image/png" })),
    );
    expect(fake.status).toBe(400);
    expect(await prisma.uploadedImage.count()).toBe(0);
    const traversal = await serveUpload(
      new Request("http://localhost:3000/x"),
      ctx({ file: "../../etc/passwd" }),
    );
    expect(traversal.status).toBe(404);
  });
});
