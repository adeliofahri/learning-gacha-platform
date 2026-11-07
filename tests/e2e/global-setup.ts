import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

/** Menyiapkan database E2E: migrate (non-destruktif) → kosongkan data → seed DEMO. */
export default async function globalSetup() {
  const url = process.env.DATABASE_URL ?? "";
  if (!/_e2e(\?|$)/.test(url))
    throw new Error("E2E hanya boleh memakai database berakhiran '_e2e'");
  const env = { ...process.env, DATABASE_URL: url };
  execSync("pnpm exec prisma migrate deploy", { stdio: "inherit", env });
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables.map((t) => `"public"."${t.tablename}"`).join(", ")} CASCADE`,
  );
  await prisma.$disconnect();
  execSync("pnpm exec tsx prisma/seed.ts", { stdio: "inherit", env });
}
