import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL wajib diisi"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET minimal 32 karakter"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_TIMEZONE: z.string().default("Asia/Jakarta"),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Validasi environment secara lazy agar next build tidak membutuhkan secret. */
export function env(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");

    throw new Error(`Konfigurasi environment tidak valid: ${issues}`);
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: parsed.data.APP_TIMEZONE });
  } catch {
    throw new Error(`APP_TIMEZONE tidak dikenal: ${parsed.data.APP_TIMEZONE}`);
  }

  cached = parsed.data;
  return cached;
}

export function appTimezone(): string {
  return process.env.APP_TIMEZONE || "Asia/Jakarta";
}