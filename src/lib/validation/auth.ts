import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username minimal 3 karakter")
  .max(20, "Username maksimal 20 karakter")
  .regex(/^[a-z0-9_]+$/, "Username hanya boleh huruf kecil, angka, dan underscore");

export const registerSchema = z
  .object({
    username: usernameSchema,
    email: z.string().trim().toLowerCase().email("Format email tidak valid").max(200),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .max(128, "Password maksimal 128 karakter")
      .regex(/[A-Za-z]/, "Password harus mengandung huruf")
      .regex(/[0-9]/, "Password harus mengandung angka"),
  })
  .strict(); // field tambahan (mis. "role") ditolak

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Format email tidak valid").max(200),
    password: z.string().min(1, "Password wajib diisi").max(128),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password lama wajib diisi").max(128),
    newPassword: registerSchema.shape.password,
  })
  .strict()
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ["newPassword"],
    message: "Password baru harus berbeda dari password lama",
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const verifyEmailSchema = z
  .object({
    token: z.string().min(32).max(200),
  })
  .strict();

export const resendVerificationSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Format email tidak valid").max(200),
  })
  .strict();