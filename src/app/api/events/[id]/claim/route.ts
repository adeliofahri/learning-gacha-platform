import { handler, json } from "@/lib/http";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { requireStudent } from "@/server/policies";
import { claimEvent } from "@/server/services/event.service";

export const POST = handler<{ id: string }>(async (_req, { user, params }) => {
  const student = requireStudent(user);
  await enforceRateLimit("claim", student.id, RATE_LIMITS.claim);
  return json({ claim: await claimEvent(student.id, params.id) }, { status: 201 });
});
