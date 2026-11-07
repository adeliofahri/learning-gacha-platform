
import { prisma } from "../src/lib/db";

const DEMO_STUDENTS = [
  {
    email: "siswa1@demo.local",
    username: "siswa_demo1",
    coins: 300,
    characters: [
      "pip-pensil",
      "kiko-kompas",
      "sena-sains",
      "arka-alkemis",
      "surya-profesor",
    ],
  },
  {
    email: "siswa2@demo.local",
    username: "siswa_demo2",
    coins: 150,
    characters: [
      "lumi-kertas",
      "rara-rumus",
      "mika-matematika",
      "nala-navigator",
    ],
  },
  {
    email: "siswa3@demo.local",
    username: "siswa_demo3",
    coins: 0,
    characters: ["tok-penghapus", "bobo-buku"],
  },
] as const;

const ADMIN_EMAIL = "admin@demo.local";

async function main() {
  // Pastikan script hanya berjalan pada database development lokal.
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL tidak ditemukan.");
  }

  const parsedUrl = new URL(databaseUrl);

  if (
    !["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname) ||
    parsedUrl.pathname !== "/learning_gacha"
  ) {
    throw new Error(
      "RESET DIBATALKAN: script hanya boleh dijalankan pada database lokal learning_gacha.",
    );
  }

  await prisma.$transaction(async (tx) => {
    // 1. Validasi akun admin.
    const admin = await tx.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (!admin || admin.role !== "ADMIN") {
      throw new Error("Akun admin demo tidak ditemukan atau bukan ADMIN.");
    }

    // 2. Validasi seluruh akun siswa.
    const users = await tx.user.findMany({
      where: {
        username: {
          in: DEMO_STUDENTS.map((student) => student.username),
        },
      },
    });

    for (const student of DEMO_STUDENTS) {
      const user = users.find(
        (item) => item.username === student.username,
      );

      if (
        !user ||
        user.email !== student.email ||
        user.role !== "STUDENT"
      ) {
        throw new Error(
          `Validasi gagal untuk akun ${student.username}. Tidak ada data yang direset.`,
        );
      }
    }

    // 3. Cari karakter berdasarkan imageUrl yang dibuat oleh seed.
    const allSlugs = [
      ...new Set(DEMO_STUDENTS.flatMap((student) => student.characters)),
    ];

    const characters = await tx.character.findMany({
      where: {
        imageUrl: {
          in: allSlugs.map((slug) => `/characters/${slug}.svg`),
        },
      },
    });

    const characterBySlug = new Map(
      allSlugs.map((slug) => [
        slug,
        characters.find(
          (character) =>
            character.imageUrl === `/characters/${slug}.svg`,
        ),
      ]),
    );

    const missingCharacters = allSlugs.filter(
      (slug) => !characterBySlug.get(slug),
    );

    if (missingCharacters.length > 0) {
      throw new Error(
        `Karakter tidak ditemukan: ${missingCharacters.join(", ")}. Tidak ada data yang direset.`,
      );
    }

    const studentIds = DEMO_STUDENTS.map((student) => {
      const user = users.find(
        (item) => item.username === student.username,
      )!;

      return user.id;
    });

    // 4. Hapus progres dan aktivitas belajar.
    await tx.questionSolve.deleteMany({
      where: { userId: { in: studentIds } },
    });

    await tx.attempt.deleteMany({
      where: { userId: { in: studentIds } },
    });

    await tx.packageProgress.deleteMany({
      where: { userId: { in: studentIds } },
    });

    // 5. Hapus aktivitas gacha dan event.
    await tx.gachaPull.deleteMany({
      where: { userId: { in: studentIds } },
    });

    await tx.stepUpProgress.deleteMany({
      where: { userId: { in: studentIds } },
    });

    await tx.eventClaim.deleteMany({
      where: { userId: { in: studentIds } },
    });

    // 6. Hapus inventaris dan riwayat transaksi siswa.
    await tx.inventoryItem.deleteMany({
      where: { userId: { in: studentIds } },
    });

    await tx.walletTransaction.deleteMany({
      where: { userId: { in: studentIds } },
    });

    // Bersihkan log aktivitas demo, termasuk log yang dibuat admin
    // untuk ketiga akun siswa. Log admin yang lain tetap dipertahankan.
    await tx.auditLog.deleteMany({
      where: {
        OR: [
          { actorId: { in: studentIds } },
          {
            targetType: "User",
            targetId: { in: studentIds },
          },
        ],
      },
    });

    // 7. Kembalikan wallet, koleksi, dan avatar siswa.
    for (const student of DEMO_STUDENTS) {
      const user = users.find(
        (item) => item.username === student.username,
      )!;

      const ownedCharacters = student.characters.map((slug) => {
        const character = characterBySlug.get(slug);

        if (!character) {
          throw new Error(`Karakter ${slug} tidak ditemukan.`);
        }

        return character;
      });

      await tx.wallet.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          coins: student.coins,
          shards: 0,
        },
        update: {
          coins: student.coins,
          shards: 0,
        },
      });

      const now = new Date();

      for (const [index, character] of ownedCharacters.entries()) {
        const obtainedAt = new Date(
          now.getTime() -
            (ownedCharacters.length - index) * 3 * 60 * 60 * 1000,
        );

        await tx.inventoryItem.create({
          data: {
            userId: user.id,
            characterId: character.id,
            quantity: 1,
            duplicateCount: 0,
            shardsFromDuplicates: 0,
            firstObtainedAt: obtainedAt,
            lastObtainedAt: obtainedAt,
          },
        });
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          avatarCharacterId:
            ownedCharacters[ownedCharacters.length - 1]?.id ?? null,
        },
      });

      // Buat ulang catatan saldo awal.
      if (student.coins > 0) {
        await tx.walletTransaction.create({
          data: {
            userId: user.id,
            currency: "COIN",
            amount: student.coins,
            balanceAfter: student.coins,
            type: "ADMIN_ADJUSTMENT",
            description: "DEMO: saldo awal dari seed",
            actorId: admin.id,
            metadata: {
              reason: "Saldo awal demo (reset)",
            },
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: admin.id,
            action: "WALLET_ADJUST",
            targetType: "User",
            targetId: user.id,
            metadata: {
              amount: student.coins,
              reason: "Saldo awal demo (reset)",
            },
          },
        });
      }

      // Catat pengembalian koleksi awal.
      await tx.auditLog.create({
        data: {
          actorId: admin.id,
          action: "SEED_INVENTORY",
          targetType: "User",
          targetId: user.id,
          metadata: {
            characters: [...student.characters],
          },
        },
      });

      console.info(
        `Reset berhasil: ${student.username} | ${student.coins} coins | ${ownedCharacters.length} karakter`,
      );
    }
  });

  console.info("\nReset akun demo berhasil!");
}

main()
  .catch((error) => {
    console.error("\nReset gagal:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
