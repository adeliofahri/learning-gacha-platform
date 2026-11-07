import { handler, json, parseBody } from "@/lib/http";
import { packageSchema } from "@/lib/validation/learning";
import { requireAdmin } from "@/server/policies";
import { createPackage } from "@/server/services/learning.service";

export const POST = handler(async (req, { user }) => {
  const admin = requireAdmin(user);
  const input = await parseBody(req, packageSchema);
  return json({ package: await createPackage(admin.id, input) }, { status: 201 });
});
