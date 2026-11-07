/**
 * SEED DATA DEMO — hanya untuk development/demo. Semua konten, akun, dan RATE GACHA di sini
 * adalah contoh dan WAJIB ditinjau admin sebelum production.
 */
import { randomUUID } from "node:crypto";
import { PrismaClient, type Difficulty } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import {
  DEMO_DIFFICULTY_BOUNTY,
  DEMO_DUPLICATE_SHARDS,
  DEMO_STEP_UP_PRICES,
} from "../src/lib/constants";

const prisma = new PrismaClient();

const ADMIN = {
  email: "admin@demo.local",
  username: "admin_demo",
  password: process.env.SEED_ADMIN_PASSWORD || "DemoAdmin123",
};
const STUDENT_PASSWORD = process.env.SEED_STUDENT_PASSWORD || "DemoSiswa123";
const STUDENTS = [
  { email: "siswa1@demo.local", username: "siswa_demo1", coins: 3000, isPublic: true },
  { email: "siswa2@demo.local", username: "siswa_demo2", coins: 1500, isPublic: false },
  { email: "siswa3@demo.local", username: "siswa_demo3", coins: 0, isPublic: true },
];

const CHARACTERS: {
  slug: string;
  name: string;
  rarity: number;
  category: "PERMANENT" | "LIMITED";
  description: string;
}[] = [
  {
    slug: "pip-pensil",
    name: "Pip si Pensil",
    rarity: 1,
    category: "PERMANENT",
    description: "Pensil kecil yang selalu siap mencatat.",
  },
  {
    slug: "lumi-kertas",
    name: "Lumi Kertas",
    rarity: 1,
    category: "PERMANENT",
    description: "Lembar kertas yang bersinar saat ide muncul.",
  },
  {
    slug: "tok-penghapus",
    name: "Tok Penghapus",
    rarity: 1,
    category: "PERMANENT",
    description: "Membantu memperbaiki kesalahan tanpa rasa malu.",
  },
  {
    slug: "kiko-kompas",
    name: "Kiko Kompas",
    rarity: 2,
    category: "PERMANENT",
    description: "Penunjuk arah para penjelajah ilmu.",
  },
  {
    slug: "rara-rumus",
    name: "Rara Rumus",
    rarity: 2,
    category: "PERMANENT",
    description: "Hafal semua rumus dasar di luar kepala.",
  },
  {
    slug: "bobo-buku",
    name: "Bobo Buku",
    rarity: 2,
    category: "PERMANENT",
    description: "Buku tebal yang suka bercerita.",
  },
  {
    slug: "sena-sains",
    name: "Sena Sains",
    rarity: 3,
    category: "PERMANENT",
    description: "Peneliti muda dengan kacamata pelindung.",
  },
  {
    slug: "hara-sejarah",
    name: "Hara Sejarah",
    rarity: 3,
    category: "PERMANENT",
    description: "Penjaga gulungan kisah masa lalu.",
  },
  {
    slug: "mika-matematika",
    name: "Mika Matematika",
    rarity: 3,
    category: "PERMANENT",
    description: "Menyelesaikan soal secepat kilat.",
  },
  {
    slug: "arka-alkemis",
    name: "Arka Alkemis",
    rarity: 4,
    category: "PERMANENT",
    description: "Mencampur unsur dengan penuh perhitungan.",
  },
  {
    slug: "nala-navigator",
    name: "Nala Navigator",
    rarity: 4,
    category: "PERMANENT",
    description: "Membaca peta bintang dan samudra.",
  },
  {
    slug: "tirta-pustaka",
    name: "Tirta Penjaga Pustaka",
    rarity: 4,
    category: "PERMANENT",
    description: "Mengenal setiap buku di perpustakaan.",
  },
  {
    slug: "surya-profesor",
    name: "Surya Sang Profesor",
    rarity: 5,
    category: "PERMANENT",
    description: "Guru bijak dengan toga keemasan.",
  },
  {
    slug: "bayu-penyihir-bahasa",
    name: "Bayu Penyihir Bahasa",
    rarity: 5,
    category: "PERMANENT",
    description: "Mantra-mantranya adalah puisi.",
  },
  {
    slug: "dewi-astronom",
    name: "Dewi Astronom",
    rarity: 5,
    category: "PERMANENT",
    description: "Memetakan rasi bintang setiap malam.",
  },
  {
    slug: "lentera-rinai",
    name: "Lentera Rinai",
    rarity: 5,
    category: "LIMITED",
    description: "Penjaga lentera festival musim hujan.",
  },
  {
    slug: "garuda-ilmu",
    name: "Garuda Ilmu",
    rarity: 6,
    category: "PERMANENT",
    description: "Legenda yang melindungi semangat belajar.",
  },
  {
    slug: "naga-logika",
    name: "Naga Logika",
    rarity: 6,
    category: "PERMANENT",
    description: "Naga yang hanya tunduk pada penalaran.",
  },
  {
    slug: "ratu-aurora",
    name: "Ratu Bintang Aurora",
    rarity: 6,
    category: "LIMITED",
    description: "Bintang utama Festival Aurora (limited).",
  },
  {
    slug: "ksatria-kala",
    name: "Ksatria Kristal Kala",
    rarity: 6,
    category: "LIMITED",
    description: "Penjaga waktu dari menara kristal (limited).",
  },
];

/** DEMO RATE: total peluang per rarity (basis 10.000). Harus ditinjau sebelum production. */
const DEMO_RARITY_WEIGHT: Record<number, number> = {
  6: 200,
  5: 600,
  4: 1200,
  3: 2000,
  2: 2500,
  1: 3500,
};

type QSeed = {
  key: string;
  subject: string;
  topic?: string;
  title: string;
  content: string;
  difficulty: Difficulty;
  explanation?: string;
  options?: [string, boolean][];
  accepted?: string[];
};

const QUESTIONS: QSeed[] = [
  {
    key: "m1",
    subject: "Matematika",
    topic: "Aritmetika",
    title: "Penjumlahan dasar",
    content: "Berapakah hasil dari 27 + 15?",
    difficulty: "EASY",
    explanation: "27 + 15 = 42.",
    options: [
      ["32", false],
      ["42", true],
      ["43", false],
      ["52", false],
    ],
  },
  {
    key: "m2",
    subject: "Matematika",
    topic: "Aritmetika",
    title: "Perkalian",
    content: "Berapakah hasil dari 12 × 8?",
    difficulty: "EASY",
    explanation: "12 × 8 = 96.",
    options: [
      ["86", false],
      ["96", true],
      ["108", false],
      ["112", false],
    ],
  },
  {
    key: "m3",
    subject: "Matematika",
    topic: "Aljabar",
    title: "Persamaan linear",
    content: "Jika 3x + 5 = 20, berapakah nilai x?",
    difficulty: "MEDIUM",
    explanation: "3x = 15 sehingga x = 5.",
    options: [
      ["3", false],
      ["4", false],
      ["5", true],
      ["6", false],
    ],
  },
  {
    key: "m4",
    subject: "Matematika",
    topic: "Geometri",
    title: "Luas lingkaran",
    content: "Luas lingkaran berjari-jari 7 cm (π = 22/7) adalah ...",
    difficulty: "HARD",
    explanation: "L = πr² = 22/7 × 49 = 154 cm².",
    options: [
      ["44 cm²", false],
      ["144 cm²", false],
      ["154 cm²", true],
      ["308 cm²", false],
    ],
  },
  {
    key: "m5",
    subject: "Matematika",
    topic: "Aljabar",
    title: "Faktor kuadrat (isian)",
    content: "Tuliskan akar-akar dari x² − 5x + 6 = 0 (pisahkan dengan koma).",
    difficulty: "EXPERT",
    explanation: "(x − 2)(x − 3) = 0 sehingga x = 2 atau x = 3.",
    accepted: ["2, 3", "2 dan 3", "3, 2"],
  },
  {
    key: "s1",
    subject: "IPA",
    topic: "Biologi",
    title: "Fotosintesis",
    content: "Organel sel tumbuhan tempat terjadinya fotosintesis adalah ...",
    difficulty: "EASY",
    explanation: "Fotosintesis terjadi di kloroplas.",
    options: [
      ["Mitokondria", false],
      ["Kloroplas", true],
      ["Ribosom", false],
      ["Vakuola", false],
    ],
  },
  {
    key: "s2",
    subject: "IPA",
    topic: "Fisika",
    title: "Satuan gaya",
    content: "Satuan SI untuk gaya adalah ...",
    difficulty: "EASY",
    explanation: "Gaya diukur dalam Newton (N).",
    options: [
      ["Joule", false],
      ["Watt", false],
      ["Newton", true],
      ["Pascal", false],
    ],
  },
  {
    key: "s3",
    subject: "IPA",
    topic: "Fisika",
    title: "Kecepatan",
    content: "Sepeda menempuh 30 km dalam 2 jam. Kecepatan rata-ratanya adalah ...",
    difficulty: "MEDIUM",
    explanation: "v = s / t = 30 / 2 = 15 km/jam.",
    options: [
      ["10 km/jam", false],
      ["15 km/jam", true],
      ["20 km/jam", false],
      ["60 km/jam", false],
    ],
  },
  {
    key: "s4",
    subject: "IPA",
    topic: "Biologi",
    title: "Sistem peredaran darah (isian)",
    content: "Sebutkan nama organ yang memompa darah ke seluruh tubuh.",
    difficulty: "MEDIUM",
    explanation: "Jantung memompa darah ke seluruh tubuh.",
    accepted: ["jantung"],
  },
  {
    key: "b1",
    subject: "Bahasa Indonesia",
    topic: "Tata Bahasa",
    title: "Kata baku",
    content: "Manakah penulisan kata baku yang benar?",
    difficulty: "EASY",
    explanation: 'Bentuk baku: "apotek".',
    options: [
      ["Apotik", false],
      ["Apotek", true],
      ["Apothek", false],
      ["Apotec", false],
    ],
  },
  {
    key: "b2",
    subject: "Bahasa Indonesia",
    topic: "Tata Bahasa",
    title: "Sinonim",
    content: 'Sinonim dari kata "cerdas" adalah ...',
    difficulty: "MEDIUM",
    explanation: "Cerdas bersinonim dengan pandai.",
    options: [
      ["Pandai", true],
      ["Malas", false],
      ["Lambat", false],
      ["Lemah", false],
    ],
  },
  {
    key: "b3",
    subject: "Bahasa Indonesia",
    topic: "Menulis",
    title: "Kalimat efektif (isian)",
    content: "Tuliskan satu kalimat efektif tentang manfaat membaca.",
    difficulty: "HARD",
    explanation:
      "Kalimat efektif memiliki subjek dan predikat yang jelas serta tidak bertele-tele.",
  },
];

const PACKAGES = [
  {
    title: "Matematika Dasar",
    subject: "Matematika",
    description: "Latihan aritmetika, aljabar, dan geometri dasar.",
    keys: ["m1", "m2", "m3", "m4", "m5"],
  },
  {
    title: "Sains Seru",
    subject: "IPA",
    description: "Mengenal fisika dan biologi sehari-hari.",
    keys: ["s1", "s2", "s3", "s4"],
  },
  {
    title: "Bahasa Indonesia Pemula",
    subject: "Bahasa Indonesia",
    description: "Kata baku, sinonim, dan kalimat efektif.",
    keys: ["b1", "b2", "b3"],
  },
  // Soal m1 dan s1 juga ada di paket lain → bounty tetap hanya sekali (status SOLVED global).
  {
    title: "Pemanasan Campuran",
    subject: null,
    description: "Campuran soal mudah dari berbagai mata pelajaran.",
    keys: ["m1", "s1", "b1", "s2"],
  },
];

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "1") {
    throw new Error(
      "Seed DEMO tidak boleh dijalankan di production (set ALLOW_DEMO_SEED=1 untuk memaksa).",
    );
  }
  const existing = await prisma.user.findUnique({ where: { email: ADMIN.email } });
  if (existing) {
    console.info(
      "Seed demo sudah pernah dijalankan. Gunakan `pnpm db:reset` untuk mengulang dari awal.",
    );
    return;
  }

  console.info("🌱 Seeding data DEMO ...");
  for (const [difficulty, bounty] of Object.entries(DEMO_DIFFICULTY_BOUNTY)) {
    await prisma.difficultyConfig.upsert({
      where: { difficulty: difficulty as Difficulty },
      create: { difficulty: difficulty as Difficulty, bounty },
      update: {},
    });
  }
  for (const [rarity, shards] of Object.entries(DEMO_DUPLICATE_SHARDS)) {
    await prisma.duplicateShardConfig.upsert({
      where: { rarity: Number(rarity) },
      create: { rarity: Number(rarity), shards },
      update: {},
    });
  }

  const admin = await prisma.user.create({
    data: {
      email: ADMIN.email,
      username: ADMIN.username,
      passwordHash: await hashPassword(ADMIN.password),
      role: "ADMIN",
    },
  });

  // ── Learning content ──
  const subjects = new Map<string, string>();
  const topics = new Map<string, string>();
  for (const q of QUESTIONS) {
    if (!subjects.has(q.subject)) {
      subjects.set(q.subject, (await prisma.subject.create({ data: { name: q.subject } })).id);
    }
    const tKey = `${q.subject}/${q.topic}`;
    if (q.topic && !topics.has(tKey)) {
      topics.set(
        tKey,
        (
          await prisma.topic.create({
            data: { name: q.topic, subjectId: subjects.get(q.subject)! },
          })
        ).id,
      );
    }
  }
  const questionIds = new Map<string, string>();
  for (const q of QUESTIONS) {
    const created = await prisma.question.create({
      data: {
        subjectId: subjects.get(q.subject)!,
        topicId: q.topic ? topics.get(`${q.subject}/${q.topic}`) : null,
        title: q.title,
        content: q.content,
        type: q.options ? "MULTIPLE_CHOICE" : "SHORT_ANSWER",
        difficulty: q.difficulty,
        bounty: DEMO_DIFFICULTY_BOUNTY[q.difficulty],
        explanation: q.explanation,
        status: "PUBLISHED",
        createdById: admin.id,
        options: q.options
          ? { create: q.options.map(([text, isCorrect], order) => ({ text, isCorrect, order })) }
          : undefined,
        acceptedAnswers: q.accepted ? { create: q.accepted.map((text) => ({ text })) } : undefined,
      },
    });
    questionIds.set(q.key, created.id);
  }
  await prisma.question.create({
    data: {
      subjectId: subjects.get("Matematika")!,
      title: "Draft: Pecahan",
      content: "Soal draft — belum terlihat siswa. 1/2 + 1/4 = ...",
      type: "MULTIPLE_CHOICE",
      difficulty: "MEDIUM",
      bounty: DEMO_DIFFICULTY_BOUNTY.MEDIUM,
      status: "DRAFT",
      createdById: admin.id,
      options: {
        create: [
          { text: "3/4", isCorrect: true, order: 0 },
          { text: "2/6", isCorrect: false, order: 1 },
        ],
      },
    },
  });
  for (const p of PACKAGES) {
    await prisma.package.create({
      data: {
        title: p.title,
        description: p.description,
        subjectId: p.subject ? subjects.get(p.subject) : null,
        status: "PUBLISHED",
        items: { create: p.keys.map((k, order) => ({ questionId: questionIds.get(k)!, order })) },
      },
    });
  }

  // ── Characters ──
  const chars = new Map<string, { id: string; rarity: number; category: string }>();
  for (const c of CHARACTERS) {
    const created = await prisma.character.create({
      data: {
        name: c.name,
        description: c.description,
        rarity: c.rarity,
        category: c.category,
        imageUrl: `/characters/${c.slug}.svg`,
      },
    });
    chars.set(c.slug, { id: created.id, rarity: c.rarity, category: c.category });
  }
  const weightFor = (pool: { rarity: number }[], rarity: number) =>
    Math.max(
      1,
      Math.round(DEMO_RARITY_WEIGHT[rarity]! / pool.filter((c) => c.rarity === rarity).length),
    );

  // ── Banners (DEMO RATE) ──
  const permanentPool = [...chars.values()].filter((c) => c.category === "PERMANENT");
  await prisma.banner.create({
    data: {
      name: "Akademi Bintang (Permanen)",
      description:
        "Banner permanen berisi seluruh karakter reguler. DEMO RATE — tinjau sebelum production.",
      type: "PERMANENT",
      status: "ACTIVE",
      singlePrice: 100,
      isDemoRate: true,
      entries: {
        create: permanentPool.map((c) => ({
          characterId: c.id,
          weight: weightFor(permanentPool, c.rarity),
          isFeatured: false,
        })),
      },
    },
  });

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const limitedPool = [
    ...permanentPool.filter((c) => c.rarity <= 5),
    chars.get("lentera-rinai")!,
    chars.get("ratu-aurora")!,
    chars.get("garuda-ilmu")!,
  ];
  await prisma.banner.create({
    data: {
      name: "Festival Aurora (Limited)",
      description:
        "Banner limited dengan featured Ratu Bintang Aurora dan Step-Up 5 tahap. Tahap 5 menjamin minimal satu 6★ (tidak otomatis featured). DEMO RATE.",
      type: "LIMITED",
      status: "ACTIVE",
      startsAt: new Date(now - day),
      endsAt: new Date(now + 30 * day),
      singlePrice: 100,
      stepUpEnabled: true,
      stepUpGuaranteeFeatured: false,
      isDemoRate: true,
      entries: {
        create: limitedPool.map((c) => ({
          characterId: c.id,
          weight: weightFor(limitedPool, c.rarity),
          isFeatured:
            c.id === chars.get("ratu-aurora")!.id || c.id === chars.get("lentera-rinai")!.id,
        })),
      },
      stepUpStages: {
        create: DEMO_STEP_UP_PRICES.map((price, i) => ({ stage: i + 1, price, pullCount: 1 })),
      },
    },
  });
  const endedPool = [...permanentPool.filter((c) => c.rarity <= 5), chars.get("ksatria-kala")!];
  await prisma.banner.create({
    data: {
      name: "Menara Kristal (Berakhir)",
      description:
        "Contoh banner limited yang sudah berakhir — tidak dapat dipakai untuk pull baru.",
      type: "LIMITED",
      status: "ACTIVE",
      startsAt: new Date(now - 60 * day),
      endsAt: new Date(now - 30 * day),
      singlePrice: 100,
      isDemoRate: true,
      entries: {
        create: endedPool.map((c) => ({
          characterId: c.id,
          weight: weightFor(endedPool, c.rarity),
          isFeatured: c.id === chars.get("ksatria-kala")!.id,
        })),
      },
    },
  });

  // ── Events ──
  await prisma.event.create({
    data: {
      name: "Bonus Selamat Datang (DEMO)",
      description: "Klaim 200 koin sekali untuk memulai petualangan belajar.",
      coinReward: 200,
      startsAt: new Date(now - day),
      endsAt: new Date(now + 60 * day),
      createdById: admin.id,
    },
  });
  await prisma.event.create({
    data: {
      name: "Bonus Rajin Belajar (DEMO)",
      description: "Selesaikan minimal 3 soal lalu klaim 300 koin. Kuota 100 siswa.",
      coinReward: 300,
      minSolved: 3,
      maxClaims: 100,
      startsAt: new Date(now - day),
      endsAt: new Date(now + 60 * day),
      createdById: admin.id,
    },
  });

  // ── Demo students (saldo awal dicatat di ledger sebagai ADMIN_ADJUSTMENT) ──
  const studentHash = await hashPassword(STUDENT_PASSWORD);
  const ownedPlan: Record<string, string[]> = {
    siswa_demo1: ["pip-pensil", "kiko-kompas", "sena-sains", "arka-alkemis", "surya-profesor"],
    siswa_demo2: ["lumi-kertas", "rara-rumus", "mika-matematika", "nala-navigator"],
    siswa_demo3: ["tok-penghapus", "bobo-buku"],
  };
  for (const s of STUDENTS) {
    const user = await prisma.user.create({
      data: {
        email: s.email,
        username: s.username,
        passwordHash: studentHash,
        isPublic: s.isPublic,
        wallet: { create: { coins: s.coins } },
      },
    });
    if (s.coins > 0) {
      await prisma.walletTransaction.create({
        data: {
          userId: user.id,
          currency: "COIN",
          amount: s.coins,
          balanceAfter: s.coins,
          type: "ADMIN_ADJUSTMENT",
          description: "DEMO: saldo awal dari seed",
          actorId: admin.id,
          metadata: { reason: "Saldo awal demo (seed)" },
        },
      });
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "WALLET_ADJUST",
          targetType: "User",
          targetId: user.id,
          metadata: { amount: s.coins, reason: "Saldo awal demo (seed)" },
        },
      });
    }
    // Koleksi awal DEMO diisi langsung (bukan dari gacha) agar leaderboard demo tidak kosong.
    // Sumbernya dicatat di audit log sebagai SEED_INVENTORY.
    const owned = ownedPlan[s.username] ?? [];
    for (const [i, slug] of owned.entries()) {
      const obtained = new Date(now - (owned.length - i) * 3 * 60 * 60 * 1000);
      await prisma.inventoryItem.create({
        data: {
          id: randomUUID(),
          userId: user.id,
          characterId: chars.get(slug)!.id,
          firstObtainedAt: obtained,
          lastObtainedAt: obtained,
        },
      });
    }
    if (owned.length) {
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarCharacterId: chars.get(owned[owned.length - 1]!)!.id },
      });
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: "SEED_INVENTORY",
          targetType: "User",
          targetId: user.id,
          metadata: { characters: owned },
        },
      });
    }
  }

  console.info("✅ Seed DEMO selesai.");
  console.info(
    `   Admin  : ${ADMIN.email} / ${process.env.SEED_ADMIN_PASSWORD ? "(dari SEED_ADMIN_PASSWORD)" : ADMIN.password}`,
  );
  console.info(
    `   Siswa  : ${STUDENTS.map((s) => s.email).join(", ")} / ${process.env.SEED_STUDENT_PASSWORD ? "(dari SEED_STUDENT_PASSWORD)" : STUDENT_PASSWORD}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
