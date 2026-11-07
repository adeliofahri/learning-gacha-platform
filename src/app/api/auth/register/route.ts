import { NextResponse } from "next/server";
import { handler, parseBody } from "@/lib/http";
import { registerSchema } from "@/lib/validation/auth";
import { clientIp, enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { registerStudent } from "@/server/services/auth.service";
import { sessionCookieOptions } from "@/lib/auth/session";

export const POST = handler(async (req) => {
  await enforceRateLimit("register", clientIp(req), RATE_LIMITS.register);
  const input = await parseBody(req, registerSchema);
  const { user, session } = await registerStudent(input);
  const res = NextResponse.json({ user }, { status: 201 });
  res.cookies.set({ ...sessionCookieOptions(session.expiresAt), value: session.token });
  return res;
});
