import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { createAdminAccount } from "@/server/services/auth.service";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { DEMO_DIFFICULTY_BOUNTY, DEMO_DUPLICATE_SHARDS } from "@/lib/constants";

export async function resetDb() {
  if (!/_test(\?|$)/.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("resetDb hanya boleh dijalankan pada database *_test");
  }
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables.map((t) => `"public"."${t.tablename}"`).join(", ")} CASCADE`,
  );
  for (const [difficulty, bounty] of Object.entries(DEMO_DIFFICULTY_BOUNTY)) {
    await prisma.difficultyConfig.create({
      data: { difficulty: difficulty as keyof typeof DEMO_DIFFICULTY_BOUNTY, bounty },
    });
  }
  for (const [rarity, shards] of Object.entries(DEMO_DUPLICATE_SHARDS)) {
    await prisma.duplicateShardConfig.create({ data: { rarity: Number(rarity), shards } });
  }
}

type ReqOptions = {
  method?: string;
  body?: unknown;
  token?: string;
  idempotencyKey?: string | null;
  ip?: string;
};

export function req(path: string, opts: ReqOptions = {}) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-forwarded-for":
      opts.ip ?? `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
  };
  if (opts.token) headers.cookie = `lgp_session=${opts.token}`;
  if (opts.idempotencyKey !== null)
    headers["idempotency-key"] = opts.idempotencyKey ?? randomUUID();
  return new Request(`http://localhost:3000${path}`, {
    method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

export const ctx = <P extends Record<string, string>>(params: P) => ({
  params: Promise.resolve(params),
});

export function tokenFrom(res: Response): string {
  const cookie = res.headers.get("set-cookie") ?? "";
  const m = /lgp_session=([^;]+)/.exec(cookie);
  if (!m) throw new Error("Cookie sesi tidak ditemukan");
  return decodeURIComponent(m[1]!);
}

let counter = 0;
export async function registerStudent(prefix = "siswa") {
  counter += 1;
  const username = `${prefix}${counter}_${Math.floor(Math.random() * 1e6)}`.slice(0, 20);
  const res = await registerRoute(
    req("/api/auth/register", {
      body: { username, email: `${username}@test.local`, password: "Password123" },
    }),
  );
  if (res.status !== 201) throw new Error(`register gagal: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { user: { id: string } };
  return { id: body.user.id, username, token: tokenFrom(res) };
}

export async function createAdmin() {
  const admin = await createAdminAccount({
    username: "admin_test",
    email: "admin@test.local",
    password: "AdminPass123",
  });
  const { token } = await createSession(admin.id);
  return { id: admin.id, token };
}

export async function coins(userId: string) {
  return (await prisma.wallet.findUniqueOrThrow({ where: { userId } })).coins;
}
export async function shards(userId: string) {
  return (await prisma.wallet.findUniqueOrThrow({ where: { userId } })).shards;
}

export async function giveCoins(userId: string, amount: number) {
  await prisma.wallet.update({ where: { userId }, data: { coins: { increment: amount } } });
  await prisma.walletTransaction.create({
    data: {
      userId,
      currency: "COIN",
      amount,
      balanceAfter: await coins(userId),
      type: "ADMIN_ADJUSTMENT",
      description: "test",
    },
  });
}

export async function makeSubject() {
  return prisma.subject.create({ data: { name: `Subjek ${randomUUID().slice(0, 6)}` } });
}

export async function makeMcQuestion(
  adminId: string,
  opts: { bounty?: number; status?: "PUBLISHED" | "DRAFT" } = {},
) {
  const subject = await makeSubject();
  return prisma.question.create({
    data: {
      subjectId: subject.id,
      title: "Soal PG",
      content: "2 + 2 = ?",
      type: "MULTIPLE_CHOICE",
      difficulty: "MEDIUM",
      bounty: opts.bounty ?? 10,
      status: opts.status ?? "PUBLISHED",
      createdById: adminId,
      explanation: "Karena 2 + 2 = 4",
      options: {
        create: [
          { text: "3", isCorrect: false, order: 0 },
          { text: "4", isCorrect: true, order: 1 },
          { text: "5", isCorrect: false, order: 2 },
        ],
      },
    },
    include: { options: { orderBy: { order: "asc" } } },
  });
}

export async function makeShortQuestion(adminId: string, bounty = 20) {
  const subject = await makeSubject();
  return prisma.question.create({
    data: {
      subjectId: subject.id,
      title: "Soal isian",
      content: "Organ pemompa darah?",
      type: "SHORT_ANSWER",
      difficulty: "HARD",
      bounty,
      status: "PUBLISHED",
      createdById: adminId,
      acceptedAnswers: { create: [{ text: "jantung" }] },
    },
  });
}

export async function makePackage(questionIds: string[], title = "Paket") {
  return prisma.package.create({
    data: {
      title,
      status: "PUBLISHED",
      items: { create: questionIds.map((questionId, order) => ({ questionId, order })) },
    },
  });
}

export async function makeCharacter(
  rarity: number,
  name = `Char ${rarity} ${randomUUID().slice(0, 6)}`,
) {
  return prisma.character.create({
    data: {
      name,
      description: "test",
      rarity,
      imageUrl: "/characters/pip-pensil.svg",
      category: "PERMANENT",
    },
  });
}

export async function makeBanner(opts: {
  entries: { characterId: string; weight: number; isFeatured?: boolean }[];
  type?: "PERMANENT" | "LIMITED";
  startsAt?: Date | null;
  endsAt?: Date | null;
  stepUp?: boolean;
  singlePrice?: number;
}) {
  const day = 86_400_000;
  const type = opts.type ?? "PERMANENT";
  return prisma.banner.create({
    data: {
      name: `Banner ${randomUUID().slice(0, 6)}`,
      description: "test",
      type,
      status: "ACTIVE",
      singlePrice: opts.singlePrice ?? 100,
      startsAt:
        opts.startsAt === undefined
          ? type === "LIMITED"
            ? new Date(Date.now() - day)
            : null
          : opts.startsAt,
      endsAt:
        opts.endsAt === undefined
          ? type === "LIMITED"
            ? new Date(Date.now() + day)
            : null
          : opts.endsAt,
      stepUpEnabled: opts.stepUp ?? false,
      entries: { create: opts.entries.map((e) => ({ ...e, isFeatured: e.isFeatured ?? false })) },
      stepUpStages: opts.stepUp
        ? {
            create: [100, 150, 200, 250, 300].map((price, i) => ({
              stage: i + 1,
              price,
              pullCount: 1,
            })),
          }
        : undefined,
    },
  });
}
