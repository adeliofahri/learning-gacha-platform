
import { NextResponse } from "next/server";
import { handler, parseBody } from "@/lib/http";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { resetPassword } from "@/server/services/auth.service";
import { clientIp, enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export const POST = handler(async (req) => {
  const input = await parseBody(req, resetPasswordSchema);

  await enforceRateLimit(
    "reset-password-ip",
    clientIp(req),
    RATE_LIMITS.login,
  );

  await resetPassword(input);

  return NextResponse.json({
    message: "Password berhasil diubah. Silakan login kembali.",
  });
});
