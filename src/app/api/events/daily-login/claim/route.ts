
import { handler, json } from "@/lib/http";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { requireStudent } from "@/server/policies";
import { claimDailyLoginReward } from "@/server/services/daily-login-reward.service";

export const POST = handler(async (_req, { user }) => {
  const student = requireStudent(user);

  await enforceRateLimit("claim", student.id, RATE_LIMITS.claim);

  const claim = await claimDailyLoginReward(student.id);

  return json({ claim }, { status: 201 });
});
