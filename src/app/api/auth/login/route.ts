import { NextResponse } from "next/server";
import { handler, parseBody } from "@/lib/http";
import { loginSchema } from "@/lib/validation/auth";
import { clientIp, enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { login } from "@/server/services/auth.service";
import { sessionCookieOptions } from "@/lib/auth/session";

export const POST = handler(async (req) => {
  const input = await parseBody(req, loginSchema);

  // Dibatasi per IP dan per email untuk mencegah brute force.
  await enforceRateLimit("login-ip", clientIp(req), RATE_LIMITS.login);
  await enforceRateLimit("login-email", input.email, RATE_LIMITS.login);

  const { user, session } = await login(input);

  const res = NextResponse.json({ user });

  res.cookies.set({
    ...sessionCookieOptions(session.expiresAt),
    value: session.token,
  });

  return res;
});