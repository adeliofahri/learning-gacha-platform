import { handler, json } from "@/lib/http";
import { requireAdmin } from "@/server/policies";
import { resetAllStudentStats } from "@/server/services/admin.service";

export const POST = handler(async (_req, { user }) => {
  const admin = requireAdmin(user);

  const result = await resetAllStudentStats(admin.id);

  return json({
    ok: true,
    result,
  });
});