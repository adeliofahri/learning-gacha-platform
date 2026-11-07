import { z } from "zod";

export const adjustmentSchema = z
  .object({
    amount: z.coerce
      .number()
      .int("Jumlah harus bilangan bulat")
      .min(-1_000_000)
      .max(1_000_000)
      .refine((n) => n !== 0, "Jumlah tidak boleh 0"),
    reason: z.string().trim().min(5, "Alasan minimal 5 karakter").max(300),
  })
  .strict();

export const userStatusSchema = z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) }).strict();

export const eventSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    description: z.string().trim().max(1000).default(""),
    coinReward: z.coerce.number().int().min(1, "Reward minimal 1").max(100_000),
    minSolved: z.coerce.number().int().min(0).max(10_000).default(0),
    maxClaims: z.coerce.number().int().min(1).max(1_000_000).nullable().optional(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE"),
  })
  .strict()
  .refine((e) => e.endsAt > e.startsAt, { path: ["endsAt"], message: "Tanggal akhir harus setelah mulai" });

export type EventInput = z.infer<typeof eventSchema>;
