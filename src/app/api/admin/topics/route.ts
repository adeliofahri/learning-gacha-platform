import { handler, json, parseBody } from "@/lib/http";
import { topicSchema } from "@/lib/validation/learning";
import { requireAdmin } from "@/server/policies";
import { createTopic } from "@/server/services/learning.service";

export const POST = handler(async (req, { user }) => {
  const admin = requireAdmin(user);
  const { subjectId, name } = await parseBody(req, topicSchema);
  return json({ topic: await createTopic(admin.id, subjectId, name) }, { status: 201 });
});
