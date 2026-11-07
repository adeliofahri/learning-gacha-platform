import { handler, json, parseBody, requireIdempotencyKey } from "@/lib/http";
import { pullSchema } from "@/lib/validation/collection";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { requireStudent } from "@/server/policies";
import { performPull } from "@/server/services/gacha.service";

/** Frontend hanya mengirim jenis pull. Harga, hasil, dan rarity ditentukan server. */
export const POST = handler<{ bannerId: string }>(async (req, { user, params }) => {
  const student = requireStudent(user);
  const idempotencyKey = requireIdempotencyKey(req);
  await enforceRateLimit("gacha", student.id, RATE_LIMITS.gacha);
  const { type } = await parseBody(req, pullSchema);
  const result = await performPull({ userId: student.id, bannerId: params.bannerId, pullType: type, idempotencyKey });
  return json(result, { status: result.replayed ? 200 : 201 });
});
