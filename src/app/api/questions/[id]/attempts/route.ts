import { handler, json, parseBody, requireIdempotencyKey } from "@/lib/http";
import { attemptSchema } from "@/lib/validation/learning";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { requireStudent } from "@/server/policies";
import { submitAttempt } from "@/server/services/learning.service";

export const POST = handler<{ id: string }>(async (req, { user, params }) => {
  const student = requireStudent(user);
  const idempotencyKey = requireIdempotencyKey(req);
  await enforceRateLimit("answer", student.id, RATE_LIMITS.answer);
  const input = await parseBody(req, attemptSchema);
  const result = await submitAttempt({ userId: student.id, questionId: params.id, input, idempotencyKey });
  return json(result, { status: result.replayed ? 200 : 201 });
});
