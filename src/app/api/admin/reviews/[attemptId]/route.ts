import { handler, json, parseBody } from "@/lib/http";
import { reviewSchema } from "@/lib/validation/learning";
import { requireAdmin } from "@/server/policies";
import { reviewAttempt } from "@/server/services/learning.service";

export const POST = handler<{ attemptId: string }>(async (req, { user, params }) => {
  const admin = requireAdmin(user);
  const { decision, feedback } = await parseBody(req, reviewSchema);
  return json(
    await reviewAttempt({ adminId: admin.id, attemptId: params.attemptId, decision, feedback }),
  );
});
