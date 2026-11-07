import { handler, json, parseBody } from "@/lib/http";
import { packageSchema } from "@/lib/validation/learning";
import { requireAdmin } from "@/server/policies";
import { updatePackage } from "@/server/services/learning.service";

export const PUT = handler<{ id: string }>(async (req, { user, params }) => {
  const admin = requireAdmin(user);
  const input = await parseBody(req, packageSchema);
  return json({ package: await updatePackage(admin.id, params.id, input) });
});
