import { handler, json, parseBody } from "@/lib/http";
import { subjectSchema } from "@/lib/validation/learning";
import { requireAdmin } from "@/server/policies";
import { createSubject } from "@/server/services/learning.service";

export const POST = handler(async (req, { user }) => {
  const admin = requireAdmin(user);
  const { name } = await parseBody(req, subjectSchema);
  return json({ subject: await createSubject(admin.id, name) }, { status: 201 });
});
