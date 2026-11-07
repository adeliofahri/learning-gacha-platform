import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

export const SEED = {
  admin: { email: "admin@demo.local", password: "DemoAdmin123" },
  student: { email: "siswa1@demo.local", password: "DemoSiswa123" },
};

/** IP acak per test agar rate limit per-IP tidak saling mengganggu (limit per email tetap berlaku). */
export function randomIp() {
  return `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
}

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await page.waitForURL(/\/(dashboard|admin)$/);
}

export async function registerStudent(page: Page) {
  const username = `e2e_${randomUUID().slice(0, 8)}`;
  await page.goto("/register");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Email").fill(`${username}@e2e.local`);
  await page.getByLabel("Password").fill("Password123");
  await page.getByRole("button", { name: "Daftar" }).click();
  await page.waitForURL(/\/dashboard$/);
  const user = await db.user.findUniqueOrThrow({ where: { username } });
  return { username, id: user.id };
}

/** Arrange: saldo awal lewat jalur ledger (ADMIN_ADJUSTMENT), sama seperti penyesuaian admin. */
export async function grantCoins(userId: string, amount: number) {
  const admin = await db.user.findUniqueOrThrow({ where: { email: SEED.admin.email } });
  const wallet = await db.wallet.update({
    where: { userId },
    data: { coins: { increment: amount } },
  });
  await db.walletTransaction.create({
    data: {
      userId,
      currency: "COIN",
      amount,
      balanceAfter: wallet.coins,
      type: "ADMIN_ADJUSTMENT",
      actorId: admin.id,
      description: "E2E: saldo awal",
    },
  });
}

export async function coins(userId: string) {
  return (await db.wallet.findUniqueOrThrow({ where: { userId } })).coins;
}

export async function bannerId(name: string) {
  return (await db.banner.findFirstOrThrow({ where: { name } })).id;
}

export async function expectWalletChip(page: Page, value: number) {
  await expect(page.getByTestId("wallet-chip")).toContainText(
    new Intl.NumberFormat("id-ID").format(value),
  );
}
