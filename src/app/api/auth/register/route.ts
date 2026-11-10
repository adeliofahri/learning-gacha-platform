import { NextResponse } from "next/server";
import { handler, parseBody } from "@/lib/http";
import { registerSchema } from "@/lib/validation/auth";
import { clientIp, enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { registerStudent } from "@/server/services/auth.service";

export const POST = handler(async (req) => {
  await enforceRateLimit("register", clientIp(req), RATE_LIMITS.register);

  const input = await parseBody(req, registerSchema);
  const { user, emailSent } = await registerStudent(input);

  return NextResponse.json(
    {
      user,
      emailSent,
      message: emailSent
        ? "Registrasi berhasil. Silakan periksa email untuk verifikasi."
        : "Akun berhasil dibuat, tetapi email belum terkirim. Silakan minta pengiriman ulang.",
    },
    { status: 201 },
  );
});