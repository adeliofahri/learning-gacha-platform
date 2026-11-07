import { handler, json, parseBody } from "@/lib/http";
import { subjectSchema } from "@/lib/validation/learning";
import { requireAdmin } from "@/server/policies";
import { renameSubject } from "@/server/services/learning.service";

export const PATCH = handler<{ id: string }>(async (req, { user, params }) => {
  const admin = requireAdmin(user);
  const { name } = await parseBody(req, subjectSchema);
  return json({ subject: await renameSubject(admin.id, params.id, name) });
});
