import { NextResponse } from "next/server";
import { handler, parseBody } from "@/lib/http";
import {
  resendVerificationSchema,
} from "@/lib/validation/auth";
import {
  clientIp,
  enforceRateLimit,
  RATE_LIMITS,
} from "@/lib/rate-limit";
import {
  resendVerificationEmail,
} from "@/server/services/auth.service";

export const POST = handler(async (req) => {
  const input = await parseBody(req, resendVerificationSchema);

  await enforceRateLimit(
    "resend-verification-ip",
    clientIp(req),
    RATE_LIMITS.resendVerificationIp,
  );

  await enforceRateLimit(
    "resend-verification-email",
    input.email,
    RATE_LIMITS.resendVerificationEmail,
  );

  await resendVerificationEmail(input.email);

  return NextResponse.json({
    message:
      "Jika akun tersebut membutuhkan verifikasi, email akan dikirim. Periksa inbox atau folder spam.",
  });
});