import { z } from "zod";

const optionSchema = z.object({
  text: z.string().trim().min(1).max(500),
  isCorrect: z.boolean(),
}).strict();

export const contributionQuestionSchema = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("MULTIPLE_CHOICE"),
      title: z.string().trim().min(3).max(200),
      content: z.string().trim().min(3).max(5000),
      imageUrl: z.string().regex(/^\/uploads\/questions\/[0-9]+-[a-f0-9]{16}\.(png|jpg|webp)$/).nullable().optional(),
      explanation: z.string().trim().max(5000).nullable().optional(),
      options: z.array(optionSchema).min(2).max(5),
    }).strict(),

    z.object({
      type: z.literal("MULTIPLE_SELECT"),
      title: z.string().trim().min(3).max(200),
      content: z.string().trim().min(3).max(5000),
      imageUrl: z.string().regex(/^\/uploads\/questions\/[0-9]+-[a-f0-9]{16}\.(png|jpg|webp)$/).nullable().optional(),
      explanation: z.string().trim().max(5000).nullable().optional(),
      options: z.array(optionSchema).min(4).max(5),
    }).strict(),

    z.object({
      type: z.literal("TRUE_FALSE"),
      title: z.string().trim().min(3).max(200),
      content: z.string().trim().min(3).max(5000),
      imageUrl: z.string().regex(/^\/uploads\/questions\/[0-9]+-[a-f0-9]{16}\.(png|jpg|webp)$/).nullable().optional(),
      explanation: z.string().trim().max(5000).nullable().optional(),
      options: z.array(optionSchema).min(3).max(4),
    }).strict(),

    z.object({
      type: z.literal("SHORT_ANSWER"),
      title: z.string().trim().min(3).max(200),
      content: z.string().trim().min(3).max(5000),
      imageUrl: z.string().regex(/^\/uploads\/questions\/[0-9]+-[a-f0-9]{16}\.(png|jpg|webp)$/).nullable().optional(),
      explanation: z.string().trim().max(5000).nullable().optional(),
      acceptedAnswers: z.array(z.string().trim().min(1).max(500)).max(10).default([]),
    }).strict(),
  ])
  .superRefine((v, ctx) => {
    if (
      v.type === "MULTIPLE_CHOICE" &&
      v.options.filter((o) => o.isCorrect).length !== 1
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Pilih tepat satu jawaban benar.",
      });
    }

    if (
      v.type === "MULTIPLE_SELECT" &&
      v.options.filter((o) => o.isCorrect).length < 2
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Pilih minimal dua jawaban benar.",
      });
    }
  });

export const contributionSubmissionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("QUESTION"),
    content: contributionQuestionSchema,
  }).strict(),
  z.object({
    type: z.literal("CHARACTER"),
    content: z.unknown(),
  }).strict(),
]);