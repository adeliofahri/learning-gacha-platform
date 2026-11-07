import { execSync } from "node:child_process";

export default function setup() {
  process.loadEnvFile(".env.test");
  if (!/_test(\?|$)/.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("Integration test hanya boleh memakai database yang namanya berakhiran '_test'");
  }
  // Non-destruktif: hanya menerapkan migration yang belum ada. Data dibersihkan per test (helpers.resetDb).
  execSync("pnpm exec prisma migrate deploy", { stdio: "inherit", env: process.env });
}
