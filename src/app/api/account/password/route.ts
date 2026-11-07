import { handler, json, parseBody } from "@/lib/http";
import { changePasswordSchema } from "@/lib/validation/auth";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { readSessionToken } from "@/lib/auth/session";
import { requireUser } from "@/server/policies";
import { changePassword } from "@/server/services/auth.service";

export const POST = handler(async (req, { user }) => {
  const u = requireUser(user);
  await enforceRateLimit("password", u.id, RATE_LIMITS.login);
  const { currentPassword, newPassword } = await parseBody(req, changePasswordSchema);
  await changePassword({
    userId: u.id,
    currentToken: readSessionToken(req) ?? "",
    currentPassword,
    newPassword,
  });
  return json({ ok: true });
});
