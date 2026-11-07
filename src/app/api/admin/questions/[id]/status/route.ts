import { handler, json, parseBody } from "@/lib/http";
import { questionStatusSchema } from "@/lib/validation/learning";
import { requireAdmin } from "@/server/policies";
import { setQuestionStatus } from "@/server/services/learning.service";

export const POST = handler<{ id: string }>(async (req, { user, params }) => {
  const admin = requireAdmin(user);
  const { status } = await parseBody(req, questionStatusSchema);
  return json({ question: await setQuestionStatus(admin.id, params.id, status) });
});
