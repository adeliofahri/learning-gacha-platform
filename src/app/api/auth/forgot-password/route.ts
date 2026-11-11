
import { NextResponse } from "next/server";
import { handler, parseBody } from "@/lib/http";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import {
  clientIp,
  enforceRateLimit,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import { requestPasswordReset } from "@/server/services/auth.service";

export const POST = handler(async (req) => {
  const input = await parseBody(req, forgotPasswordSchema);

  await enforceRateLimit(
    "forgot-password-ip",
    clientIp(req),
    RATE_LIMITS.forgotPasswordIp,
  );

  await enforceRateLimit(
    "forgot-password-email",
    input.email,
    RATE_LIMITS.forgotPasswordEmail,
  );

  await requestPasswordReset(input.email);

  return NextResponse.json({
    message:
      "Jika email terdaftar, instruksi reset password akan dikirim. Silakan periksa inbox atau folder spam.",
  });
});
