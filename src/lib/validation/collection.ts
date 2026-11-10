import { z } from "zod";
import { idSchema } from "./learning";

/** Hanya path gambar lokal yang diizinkan (mencegah hotlink/tracking pihak ketiga). */
export const imagePathSchema = z
  .string()
  .trim()
  .max(300)
  .regex(
    /^\/(characters|uploads\/characters|images)\/[A-Za-z0-9._-]+\.(png|jpe?g|webp|svg)$/,
    "Gambar harus berupa path lokal (/characters/... atau /uploads/characters/...)",
  );

export const borderImagePathSchema = z
  .string()
  .trim()
  .max(300)
  .regex(
    /^\/uploads\/characters\/[0-9]+-[a-f0-9]{16}\.(png|jpg|webp)$/,
    "URL gambar border tidak valid",
  );

const limitedBorderConfigSchema = z
  .object({
    colors: z.array(
      z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Format warna harus HEX"),
    ).min(2).max(5),
    angle: z.number().int().min(0).max(360),
  })
  .strict();

export const characterSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    description: z.string().trim().max(1000).default(""),
    rarity: z.coerce.number().int().min(1, "Rarity 1-6").max(6, "Rarity 1-6"),
    imageUrl: imagePathSchema,
    category: z.enum(["PERMANENT", "LIMITED"]),
    status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE"),

    // Optional agar edit karakter lama tidak menghapus konfigurasi border.
    limitedBorderType: z.enum(["PRESET", "GRADIENT", "IMAGE"]).optional(),
    limitedBorderConfig: limitedBorderConfigSchema.nullable().optional(),
    limitedBorderImageUrl: borderImagePathSchema.nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.limitedBorderType === "GRADIENT" &&
      !value.limitedBorderConfig
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["limitedBorderConfig"],
        message: "Konfigurasi gradient wajib diisi",
      });
    }

    if (
      value.limitedBorderType === "IMAGE" &&
      !value.limitedBorderImageUrl
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["limitedBorderImageUrl"],
        message: "Gambar border wajib diunggah",
      });
    }
  });

export const bannerSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    description: z.string().trim().max(2000).default(""),
    type: z.enum(["PERMANENT", "LIMITED"]),
    startsAt: z.coerce.date().nullable().optional(),
    endsAt: z.coerce.date().nullable().optional(),
    singlePrice: z.coerce.number().int().min(1).max(100_000),
    stepUpEnabled: z.boolean().default(false),
    stepUpGuaranteeFeatured: z.boolean().default(false),
    isDemoRate: z.boolean().default(true),
    imageUrl: imagePathSchema.nullable().optional(),
    entries: z
      .array(
        z.object({
          characterId: idSchema,
          weight: z.coerce.number().int().min(1, "Weight minimal 1").max(1_000_000),
          isFeatured: z.boolean().default(false),
        }),
      )
      .max(200),
    stages: z
      .array(
        z.object({
          stage: z.coerce.number().int().min(1).max(5),
          price: z.coerce.number().int().min(1).max(100_000),
          pullCount: z.coerce.number().int().min(1).max(10).default(1),
        }),
      )
      .max(5)
      .default([]),
  })
  .strict()
  .superRefine((b, ctx) => {
    const ids = b.entries.map((e) => e.characterId);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: "custom", path: ["entries"], message: "Karakter duplikat di banner" });
    }
    const stages = b.stages.map((s) => s.stage);
    if (new Set(stages).size !== stages.length) {
      ctx.addIssue({ code: "custom", path: ["stages"], message: "Tahap step-up duplikat" });
    }
  });

export const pullSchema = z.object({ type: z.enum(["SINGLE", "TEN_PULL", "STEP_UP"]) }).strict();

export const profileSchema = z
  .object({
    isPublic: z.boolean().optional(),
    avatarCharacterId: idSchema.nullable().optional(),
  })
  .strict();

export type CharacterInput = z.infer<typeof characterSchema>;
export type BannerInput = z.infer<typeof bannerSchema>;
