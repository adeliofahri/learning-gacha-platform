import { expect, test } from "@playwright/test";
import {
  bannerId,
  coins,
  db,
  expectWalletChip,
  grantCoins,
  login,
  randomIp,
  registerStudent,
  SEED,
} from "./helpers";

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
});

test.afterAll(async () => {
  await db.$disconnect();
});

test("1. student login → pilih paket → jawab benar → saldo bertambah", async ({ page }) => {
  await login(page, SEED.student.email, SEED.student.password);
  const user = await db.user.findUniqueOrThrow({ where: { email: SEED.student.email } });
  const before = await coins(user.id);

  await page.getByRole("link", { name: "Belajar" }).first().click();
  const card = page.getByTestId("package-card").filter({ hasText: "Matematika Dasar" });
  await card.getByRole("link", { name: /Mulai|Lanjutkan/ }).click();
  await expect(page.getByRole("heading", { name: "Matematika Dasar" })).toBeVisible();

  const q1 = page.getByTestId("question-1");
  await q1.getByLabel("42").check();
  await q1.getByRole("button", { name: "Kirim jawaban" }).click();
  await expect(q1.getByTestId("attempt-result")).toContainText("+5 koin");
  await expect(q1.getByTestId("question-status")).toHaveText("Selesai");

  expect(await coins(user.id)).toBe(before + 5);
  const reward = await db.walletTransaction.findFirstOrThrow({
    where: { userId: user.id, type: "QUESTION_REWARD" },
  });
  expect(reward.amount).toBe(5);
  await expectWalletChip(page, before + 5);

  // Progress tersimpan setelah logout & login kembali
  await page.getByRole("button", { name: "Keluar" }).click();
  await page.waitForURL(/\/login$/);
  await login(page, SEED.student.email, SEED.student.password);
  await page.goto(
    `/packages/${(await db.package.findFirstOrThrow({ where: { title: "Matematika Dasar" } })).id}`,
  );
  await expect(page.getByTestId("package-progress")).toContainText("1/5");
});

test("2. student mengirim jawaban isian → admin approve → saldo bertambah", async ({
  page,
  browser,
}) => {
  const s = await registerStudent(page);
  const pkg = await db.package.findFirstOrThrow({ where: { title: "Sains Seru" } });
  await page.goto(`/packages/${pkg.id}`);
  const q = page.getByTestId("question-4");
  await q.getByLabel("Jawabanmu").fill("Jantung");
  await q.getByRole("button", { name: "Kirim jawaban" }).click();
  await expect(q).toContainText("Menunggu review admin");
  const attempt = await db.attempt.findFirstOrThrow({
    where: { userId: s.id, status: "PENDING_REVIEW" },
  });
  expect(await coins(s.id)).toBe(0);

  const adminCtx = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": randomIp() },
  });
  const admin = await adminCtx.newPage();
  await login(admin, SEED.admin.email, SEED.admin.password);
  await admin.goto("/admin/reviews");
  const item = admin.getByTestId("review-item").filter({ hasText: s.username });
  await expect(item).toContainText("Jantung");
  await item.getByLabel("Feedback (opsional)").fill("Tepat sekali!");
  await item.getByTestId("approve").click();
  await expect(admin.getByTestId("review-item").filter({ hasText: s.username })).toHaveCount(0);
  await adminCtx.close();

  expect(await db.attempt.findUniqueOrThrow({ where: { id: attempt.id } })).toMatchObject({
    status: "APPROVED",
    feedback: "Tepat sekali!",
  });
  expect(await coins(s.id)).toBe(10); // bounty MEDIUM (demo)
  await page.reload();
  await expect(page.getByTestId("question-4").getByTestId("question-status")).toHaveText("Selesai");
  await expectWalletChip(page, 10);
});

test("3. student membuka banner → single pull → karakter masuk inventory", async ({ page }) => {
  const s = await registerStudent(page);
  await grantCoins(s.id, 100);
  await page.goto("/gacha");
  await page
    .getByTestId("banner-card")
    .filter({ hasText: "Akademi Bintang (Permanen)" })
    .getByRole("link", { name: "Buka banner" })
    .click();
  await expect(page.getByRole("heading", { name: "Rate disclosure" })).toBeVisible();
  await page.getByTestId("pull-SINGLE").click();
  await expect(page.getByRole("dialog")).toContainText("Saldo setelah pull");
  await page.getByTestId("confirm-pull").click();
  const results = page.getByTestId("pull-results");
  await expect(results.locator("> div")).toHaveCount(1);
  await expect(results).toContainText("Baru!");

  expect(await coins(s.id)).toBe(0);
  const inv = await db.inventoryItem.findMany({
    where: { userId: s.id },
    include: { character: true },
  });
  expect(inv).toHaveLength(1);
  await page.getByRole("button", { name: "Tutup" }).first().click();
  await page.goto("/collection");
  await expect(page.getByTestId("collection-grid")).toContainText(inv[0]!.character.name);
});

test("4. student melakukan ten-pull → tepat 10 hasil", async ({ page }) => {
  const s = await registerStudent(page);
  await grantCoins(s.id, 900);
  await page.goto(`/gacha/${await bannerId("Akademi Bintang (Permanen)")}`);
  await page.getByTestId("pull-TEN_PULL").click();
  await page.getByTestId("confirm-pull").click();
  await expect(page.getByTestId("pull-results").locator("> div")).toHaveCount(10);

  expect(await coins(s.id)).toBe(0);
  const pulls = await db.gachaPull.findMany({
    where: { userId: s.id },
    include: { results: true },
  });
  expect(pulls).toHaveLength(1);
  expect(pulls[0]!.results).toHaveLength(10);
  expect(pulls[0]!.price).toBe(900);
  const unique = new Set(pulls[0]!.results.map((r) => r.characterId)).size;
  expect(await db.inventoryItem.count({ where: { userId: s.id } })).toBe(unique);
  const dupeShards = pulls[0]!.results.reduce((sum, r) => sum + r.shardsAwarded, 0);
  expect((await db.wallet.findUniqueOrThrow({ where: { userId: s.id } })).shards).toBe(dupeShards);
});

test("5. student menjalankan step-up sampai tahap 5 → memperoleh jaminan 6★", async ({ page }) => {
  const s = await registerStudent(page);
  await grantCoins(s.id, 1000);
  await page.goto(`/gacha/${await bannerId("Festival Aurora (Limited)")}`);
  for (let stage = 1; stage <= 5; stage++) {
    await expect(page.getByTestId("pull-STEP_UP")).toContainText(`Step-Up tahap ${stage}`);
    await page.getByTestId("pull-STEP_UP").click();
    await page.getByTestId("confirm-pull").click();
    await expect(page.getByTestId("pull-results")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText(`Hasil pull — Step-Up tahap ${stage}`);
    await page.getByRole("dialog").getByRole("button", { name: "Tutup" }).first().click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  const pulls = await db.gachaPull.findMany({
    where: { userId: s.id },
    include: { results: true },
    orderBy: { createdAt: "asc" },
  });
  expect(pulls.map((p) => p.price)).toEqual([100, 150, 200, 250, 300]);
  expect(pulls.map((p) => p.stepNumber)).toEqual([1, 2, 3, 4, 5]);
  expect(pulls[4]!.results.some((r) => r.rarity === 6)).toBe(true);
  expect(await coins(s.id)).toBe(0);
  const progress = await db.stepUpProgress.findFirstOrThrow({ where: { userId: s.id } });
  expect(progress).toMatchObject({ currentStage: 1, cyclesCompleted: 1 });
  await expect(page.getByTestId("pull-STEP_UP")).toContainText("Step-Up tahap 1");
});

test("6. student memilih avatar dari inventory", async ({ page }) => {
  await login(page, SEED.student.email, SEED.student.password);
  const user = await db.user.findUniqueOrThrow({ where: { email: SEED.student.email } });
  await page.goto("/profile");
  await page.locator("label", { hasText: "Kiko Kompas" }).click();
  await expect(page.getByLabel("Kiko Kompas")).toBeChecked();
  await page.getByRole("button", { name: "Simpan profil" }).click();
  await expect(page.getByText("Profil tersimpan.")).toBeVisible();
  const kiko = await db.character.findUniqueOrThrow({ where: { name: "Kiko Kompas" } });
  expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).avatarCharacterId).toBe(
    kiko.id,
  );

  // Karakter yang tidak dimiliki tidak ada di pilihan, dan API menolaknya.
  await expect(page.getByLabel("Ratu Bintang Aurora")).toHaveCount(0);
  const ratu = await db.character.findUniqueOrThrow({ where: { name: "Ratu Bintang Aurora" } });
  const res = await page.request.patch("/api/profile", {
    data: { avatarCharacterId: ratu.id },
    headers: { origin: new URL(page.url()).origin },
  });
  expect(res.status()).toBe(403);
  expect((await db.user.findUniqueOrThrow({ where: { id: user.id } })).avatarCharacterId).toBe(
    kiko.id,
  );
});

test("7. public visitor membuka leaderboard tanpa melihat data privat", async ({ page }) => {
  await page.goto("/leaderboard");
  await expect(page.getByRole("heading", { name: "Leaderboard" })).toBeVisible();
  await expect(page.getByText("siswa_demo1")).toBeVisible();
  const html = await page.content();
  expect(html).not.toContain("@demo.local");
  expect(html).not.toContain("argon2");

  await page.getByRole("tab", { name: "Bulanan" }).click();
  await expect(page).toHaveURL(/period=monthly/);

  const api = await page.request.get("/api/leaderboard");
  const body = await api.json();
  const raw = JSON.stringify(body);
  expect(raw).not.toContain("@");
  expect(raw).not.toContain("passwordHash");
  expect(raw).not.toContain("userId");

  // Profil privat (siswa_demo2) tidak menampilkan koleksi
  await page.goto("/students/siswa_demo2");
  await expect(page.getByText("Koleksi bersifat privat")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("siswa2@demo.local");

  // Visitor tanpa login diarahkan ke /login untuk halaman siswa/admin
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
});
