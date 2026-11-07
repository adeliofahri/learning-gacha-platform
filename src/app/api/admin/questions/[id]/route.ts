import { handler, json, parseBody } from "@/lib/http";
import { questionSchema } from "@/lib/validation/learning";
import { requireAdmin } from "@/server/policies";
import { updateQuestion } from "@/server/services/learning.service";

export const PUT = handler<{ id: string }>(async (req, { user, params }) => {
  const admin = requireAdmin(user);
  const input = await parseBody(req, questionSchema);
  return json({ question: await updateQuestion(admin.id, params.id, input) });
});
