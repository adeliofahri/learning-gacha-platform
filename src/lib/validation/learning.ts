import { z } from "zod";

export const idSchema = z.string().min(1).max(64);
const difficulty = z.enum(["EASY", "MEDIUM", "HARD", "EXPERT"]);
const contentStatus = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const subjectSchema = z.object({ name: z.string().trim().min(2).max(80) }).strict();
export const topicSchema = z
  .object({ subjectId: idSchema, name: z.string().trim().min(2).max(80) })
  .strict();

const baseQuestion = {
  subjectId: idSchema,
  topicId: idSchema.nullable().optional(),
  title: z.string().trim().min(3, "Judul minimal 3 karakter").max(200),
  content: z.string().trim().min(3, "Isi soal minimal 3 karakter").max(5000),
  difficulty,
  bounty: z.coerce.number().int().min(0).max(10_000).optional(),
  explanation: z.string().trim().max(5000).nullable().optional(),
  status: contentStatus.default("DRAFT"),
  imageUrl: z
  .string()
  .regex(
    /^\/uploads\/questions\/[0-9]+-[a-f0-9]{16}\.(png|jpg|webp)$/,
    "URL gambar tidak valid",
  )
  .nullable()
  .optional(),
};

export const questionSchema = z
  .discriminatedUnion("type", [
    // Pilihan ganda: 2-5 pilihan, tepat 1 benar
    z
      .object({
        ...baseQuestion,
        type: z.literal("MULTIPLE_CHOICE"),
        options: z
          .array(
            z.object({
              text: z.string().trim().min(1, "Teks pilihan wajib diisi").max(500),
              isCorrect: z.boolean(),
            }),
          )
          .min(2, "Minimal 2 pilihan")
          .max(5, "Maksimal 5 pilihan"),
      })
      .strict(),

    // Pilihan ganda kompleks: 4-5 pilihan, minimal 2 benar
    z
      .object({
        ...baseQuestion,
        type: z.literal("MULTIPLE_SELECT"),
        options: z
          .array(
            z.object({
              text: z.string().trim().min(1, "Teks pilihan wajib diisi").max(500),
              isCorrect: z.boolean(),
            }),
          )
          .min(4, "Minimal 4 pilihan")
          .max(5, "Maksimal 5 pilihan"),
      })
      .strict(),

    // Benar-salah: 3-4 pernyataan
    z
      .object({
        ...baseQuestion,
        type: z.literal("TRUE_FALSE"),
        options: z
          .array(
            z.object({
              text: z.string().trim().min(1, "Pernyataan wajib diisi").max(500),
              isCorrect: z.boolean(),
            }),
          )
          .min(3, "Minimal 3 pernyataan")
          .max(4, "Maksimal 4 pernyataan"),
      })
      .strict(),

    // Isian singkat: maksimal 10 jawaban acuan
    z
      .object({
        ...baseQuestion,
        type: z.literal("SHORT_ANSWER"),
        acceptedAnswers: z
          .array(z.string().trim().min(1).max(500))
          .max(10)
          .default([]),
      })
      .strict(),
  ])
  .superRefine((q, ctx) => {
    if (
      q.type === "MULTIPLE_CHOICE" &&
      q.options.filter((o) => o.isCorrect).length !== 1
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Harus ada tepat satu jawaban benar",
      });
    }

    if (
      q.type === "MULTIPLE_SELECT" &&
      q.options.filter((o) => o.isCorrect).length < 2
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Pilihan ganda kompleks harus memiliki minimal 2 jawaban benar",
      });
    }
  });

export const questionStatusSchema = z.object({ status: contentStatus }).strict();

export const packageSchema = z
  .object({
    title: z.string().trim().min(3).max(150),
    description: z.string().trim().max(2000).nullable().optional(),
    coverImageUrl: z
      .string()
      .regex(
        /^\/uploads\/characters\/[0-9]+-[a-f0-9]{16}\.(png|jpg|webp)$/,
        "URL gambar paket tidak valid",
      )
      .nullable()
      .optional(),
    subjectId: idSchema.nullable().optional(),
    status: contentStatus.default("DRAFT"),
    questionIds: z.array(idSchema).max(200),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (new Set(p.questionIds).size !== p.questionIds.length) {
      ctx.addIssue({
        code: "custom",
        path: ["questionIds"],
        message: "Soal duplikat dalam paket",
      });
    }
  });

export const attemptSchema = z
  .object({
    packageId: idSchema.nullable().optional(),

    // Pilihan ganda
    optionId: idSchema.optional(),

    // Pilihan ganda kompleks
    optionIds: z.array(idSchema).min(2).max(5).optional(),

    // Benar-salah
    trueFalseAnswers: z
      .array(
        z
          .object({
            optionId: idSchema,
            value: z.boolean(),
          })
          .strict(),
      )
      .min(3)
      .max(4)
      .optional(),

    // Isian singkat
    answerText: z
      .string()
      .trim()
      .min(1, "Jawaban wajib diisi")
      .max(2000)
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const answerCount = [
      value.optionId !== undefined,
      value.optionIds !== undefined,
      value.trueFalseAnswers !== undefined,
      value.answerText !== undefined,
    ].filter(Boolean).length;

    if (answerCount !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "Kirim tepat satu jenis jawaban",
      });
    }

    if (
      value.optionIds &&
      new Set(value.optionIds).size !== value.optionIds.length
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["optionIds"],
        message: "Pilihan jawaban tidak boleh duplikat",
      });
    }

    if (value.trueFalseAnswers) {
      const ids = value.trueFalseAnswers.map((answer) => answer.optionId);

      if (new Set(ids).size !== ids.length) {
        ctx.addIssue({
          code: "custom",
          path: ["trueFalseAnswers"],
          message: "Pernyataan tidak boleh dijawab lebih dari sekali",
        });
      }
    }
  });

export const reviewSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    feedback: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export const difficultySettingsSchema = z
  .object({
    unlockShardCost: z.coerce.number().int().min(0).max(100_000),
    bounties: z.object({
      EASY: z.coerce.number().int().min(0).max(10_000),
      MEDIUM: z.coerce.number().int().min(0).max(10_000),
      HARD: z.coerce.number().int().min(0).max(10_000),
      EXPERT: z.coerce.number().int().min(0).max(10_000),
    }),
    shards: z.object({
      "1": z.coerce.number().int().min(0).max(100_000),
      "2": z.coerce.number().int().min(0).max(100_000),
      "3": z.coerce.number().int().min(0).max(100_000),
      "4": z.coerce.number().int().min(0).max(100_000),
      "5": z.coerce.number().int().min(0).max(100_000),
      "6": z.coerce.number().int().min(0).max(100_000),
    }),
  })
  .strict();

export type QuestionInput = z.infer<typeof questionSchema>;
export type PackageInput = z.infer<typeof packageSchema>;
export type AttemptInput = z.infer<typeof attemptSchema>;

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Format warna harus HEX");

export const rarityStyleSchema = z
  .object({
    rarity: z.number().int().min(1).max(6),
    borderType: z.enum(["PRESET", "GRADIENT", "IMAGE"]),
    borderConfig: z
      .object({
        colors: z.array(hexColorSchema).min(2).max(5),
        angle: z.number().int().min(0).max(360),
      })
      .strict()
      .nullable(),
    borderImageUrl: z
      .string()
      .regex(
        /^\/uploads\/characters\/[0-9]+-[a-f0-9]{16}\.(png|jpg|webp)$/,
        "URL gambar border tidak valid",
      )
      .nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.borderType === "GRADIENT" && !value.borderConfig) {
      ctx.addIssue({
        code: "custom",
        path: ["borderConfig"],
        message: "Konfigurasi gradient wajib diisi",
      });
    }

    if (value.borderType === "IMAGE" && !value.borderImageUrl) {
      ctx.addIssue({
        code: "custom",
        path: ["borderImageUrl"],
        message: "Gambar border wajib diunggah",
      });
    }
  });