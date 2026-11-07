import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { POST as pullRoute } from "@/app/api/gacha/[bannerId]/pull/route";
import { POST as publishRoute } from "@/app/api/admin/banners/[id]/publish/route";
import { POST as createBannerRoute } from "@/app/api/admin/banners/route";
import { coins, createAdmin, ctx, giveCoins, makeBanner, makeCharacter, registerStudent, req, resetDb, shards } from "./helpers";

beforeEach(resetDb);

const pull = (bannerId: string, token: string, type: string, idempotencyKey?: string) =>
  pullRoute(req(`/api/gacha/${bannerId}/pull`, { token, body: { type }, idempotencyKey }), ctx({ bannerId }));

type PullBody = {
  price: number;
  stepNumber: number | null;
  replayed: boolean;
  results: { characterId: string; rarity: number; isNew: boolean; isGuaranteed: boolean; shardsAwarded: number }[];
};

describe("gacha", () => {
  it("single pull mengurangi saldo tepat, karakter masuk inventory, history tersimpan", async () => {
    const s = await registerStudent();
    await giveCoins(s.id, 250);
    const c = await makeCharacter(3);
    const banner = await makeBanner({ entries: [{ characterId: c.id, weight: 1 }] });
    const res = await pull(banner.id, s.token, "SINGLE");
    expect(res.status).toBe(201);
    const body = (await res.json()) as PullBody;
    expect(body.price).toBe(100);
    expect(body.results).toHaveLength(1);
    expect(body.results[0]).toMatchObject({ characterId: c.id, rarity: 3, isNew: true, shardsAwarded: 0 });
    expect(await coins(s.id)).toBe(150);
    const inv = await prisma.inventoryItem.findUniqueOrThrow({ where: { userId_characterId: { userId: s.id, characterId: c.id } } });
    expect(inv.quantity).toBe(1);
    const spend = await prisma.walletTransaction.findFirstOrThrow({ where: { userId: s.id, type: "GACHA_SPEND" } });
    expect(spend).toMatchObject({ amount: -100, balanceAfter: 150, referenceType: "GachaPull" });
    expect(await prisma.gachaPull.count({ where: { userId: s.id, pullType: "SINGLE", price: 100 } })).toBe(1);
  });

  it("frontend tidak bisa memilih karakter/harga (field tambahan ditolak)", async () => {
    const s = await registerStudent();
    await giveCoins(s.id, 500);
    const c = await makeCharacter(1);
    const banner = await makeBanner({ entries: [{ characterId: c.id, weight: 1 }] });
    const res = await pullRoute(
      req(`/api/gacha/${banner.id}/pull`, { token: s.token, body: { type: "SINGLE", characterId: c.id, price: 1 } }),
      ctx({ bannerId: banner.id }),
    );
    expect(res.status).toBe(400);
    expect(await coins(s.id)).toBe(500);
  });

  it("saldo kurang → ditolak tanpa perubahan apa pun (rollback)", async () => {
    const s = await registerStudent();
    await giveCoins(s.id, 899);
    const c = await makeCharacter(1);
    const banner = await makeBanner({ entries: [{ characterId: c.id, weight: 1 }] });
    const res = await pull(banner.id, s.token, "TEN_PULL");
    expect(res.status).toBe(409);
    expect(await coins(s.id)).toBe(899);
    expect(await prisma.gachaPull.count()).toBe(0);
    expect(await prisma.inventoryItem.count()).toBe(0);
  });

  it("ten-pull menghasilkan tepat 10 hasil, dikurangi 900 sekali, duplikat dikonversi ke shard", async () => {
    const s = await registerStudent();
    await giveCoins(s.id, 1000);
    const c = await makeCharacter(4); // satu-satunya karakter → 1 baru + 9 duplikat
    const banner = await makeBanner({ entries: [{ characterId: c.id, weight: 1 }] });
    const res = await pull(banner.id, s.token, "TEN_PULL");
    expect(res.status).toBe(201);
    const body = (await res.json()) as PullBody;
    expect(body.results).toHaveLength(10);
    expect(body.price).toBe(900);
    expect(body.results.filter((r) => r.isNew)).toHaveLength(1);
    expect(body.results.filter((r) => !r.isNew).every((r) => r.shardsAwarded === 10)).toBe(true);
    expect(await coins(s.id)).toBe(100);
    expect(await shards(s.id)).toBe(90);
    expect(await prisma.walletTransaction.count({ where: { userId: s.id, type: "GACHA_SPEND" } })).toBe(1);
    expect(await prisma.walletTransaction.count({ where: { userId: s.id, type: "DUPLICATE_CONVERSION", currency: "SHARD" } })).toBe(9);
    const inv = await prisma.inventoryItem.findFirstOrThrow({ where: { userId: s.id } });
    expect(inv).toMatchObject({ quantity: 1, duplicateCount: 9, shardsFromDuplicates: 90 });
  });

  it("retry dengan Idempotency-Key sama tidak menarik koin dua kali", async () => {
    const s = await registerStudent();
    await giveCoins(s.id, 300);
    const c = await makeCharacter(2);
    const banner = await makeBanner({ entries: [{ characterId: c.id, weight: 1 }] });
    const key = "gacha-retry-123456";
    const results = await Promise.all([pull(banner.id, s.token, "SINGLE", key), pull(banner.id, s.token, "SINGLE", key)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 201]);
    expect(await coins(s.id)).toBe(200);
    expect(await prisma.gachaPull.count()).toBe(1);
  });

  it("banner ended tidak dapat digunakan", async () => {
    const s = await registerStudent();
    await giveCoins(s.id, 500);
    const c = await makeCharacter(2);
    const banner = await makeBanner({
      type: "LIMITED",
      entries: [{ characterId: c.id, weight: 1 }],
      startsAt: new Date(Date.now() - 2 * 86_400_000),
      endsAt: new Date(Date.now() - 1000),
    });
    const res = await pull(banner.id, s.token, "SINGLE");
    expect(res.status).toBe(409);
    expect((await res.json()).error.message).toMatch(/berakhir/);
    expect(await coins(s.id)).toBe(500);
  });

  it("step-up: 5 tahap berurutan, harga per tahap, jaminan 6★ di tahap 5, lalu reset", async () => {
    const s = await registerStudent();
    await giveCoins(s.id, 1000);
    const common = await makeCharacter(1);
    const six = await makeCharacter(6);
    const banner = await makeBanner({
      type: "LIMITED",
      stepUp: true,
      entries: [
        { characterId: common.id, weight: 1_000_000 },
        { characterId: six.id, weight: 1 },
      ],
    });
    const prices: number[] = [];
    let last: PullBody | undefined;
    for (let stage = 1; stage <= 5; stage++) {
      const res = await pull(banner.id, s.token, "STEP_UP");
      expect(res.status).toBe(201);
      last = (await res.json()) as PullBody;
      expect(last.stepNumber).toBe(stage);
      prices.push(last.price);
    }
    expect(prices).toEqual([100, 150, 200, 250, 300]);
    expect(last!.results.some((r) => r.rarity === 6)).toBe(true);
    expect(await coins(s.id)).toBe(0);
    const progress = await prisma.stepUpProgress.findUniqueOrThrow({ where: { userId_bannerId: { userId: s.id, bannerId: banner.id } } });
    expect(progress).toMatchObject({ currentStage: 1, cyclesCompleted: 1 });
    expect(await prisma.inventoryItem.count({ where: { userId: s.id, characterId: six.id } })).toBe(1);
  });

  it("step-up tidak tersedia di banner yang tidak mengaktifkannya; banner berakhir di tengah siklus menyimpan progress", async () => {
    const s = await registerStudent();
    await giveCoins(s.id, 1000);
    const six = await makeCharacter(6);
    const plain = await makeBanner({ entries: [{ characterId: six.id, weight: 1 }] });
    expect((await pull(plain.id, s.token, "STEP_UP")).status).toBe(400);

    const limited = await makeBanner({ type: "LIMITED", stepUp: true, entries: [{ characterId: six.id, weight: 1 }] });
    await pull(limited.id, s.token, "STEP_UP");
    await pull(limited.id, s.token, "STEP_UP");
    await prisma.banner.update({ where: { id: limited.id }, data: { endsAt: new Date(Date.now() - 1000) } });
    expect((await pull(limited.id, s.token, "STEP_UP")).status).toBe(409);
    const progress = await prisma.stepUpProgress.findUniqueOrThrow({ where: { userId_bannerId: { userId: s.id, bannerId: limited.id } } });
    expect(progress.currentStage).toBe(3);
    expect(await prisma.gachaPull.count({ where: { bannerId: limited.id } })).toBe(2);
  });

  it("admin: banner baru DRAFT, publish divalidasi", async () => {
    const admin = await createAdmin();
    const c1 = await makeCharacter(1);
    const res = await createBannerRoute(
      req("/api/admin/banners", {
        token: admin.token,
        body: {
          name: "Limited Uji", type: "LIMITED", singlePrice: 100, stepUpEnabled: true,
          startsAt: new Date(Date.now() - 1000).toISOString(), endsAt: new Date(Date.now() + 86_400_000).toISOString(),
          entries: [{ characterId: c1.id, weight: 10 }],
          stages: [1, 2, 3, 4, 5].map((stage) => ({ stage, price: 100, pullCount: 1 })),
        },
      }),
    );
    expect(res.status).toBe(201);
    const { banner } = await res.json();
    expect(banner.status).toBe("DRAFT");
    const publish = await publishRoute(req(`/api/admin/banners/${banner.id}/publish`, { token: admin.token, body: {} }), ctx({ id: banner.id }));
    expect(publish.status).toBe(422); // tidak ada 6★ untuk jaminan step-up
    const six = await makeCharacter(6);
    await prisma.bannerCharacter.create({ data: { bannerId: banner.id, characterId: six.id, weight: 1 } });
    const ok = await publishRoute(req(`/api/admin/banners/${banner.id}/publish`, { token: admin.token, body: {} }), ctx({ id: banner.id }));
    expect(ok.status).toBe(200);
  });
});
