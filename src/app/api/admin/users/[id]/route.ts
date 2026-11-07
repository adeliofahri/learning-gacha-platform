import { handler, json, parseBody } from "@/lib/http";
import { userStatusSchema } from "@/lib/validation/economy";
import { requireAdmin } from "@/server/policies";
import { getStudentDetail, setUserStatus } from "@/server/services/admin.service";

export const GET = handler<{ id: string }>(async (_req, { user, params }) => {
  requireAdmin(user);
  const detail = await getStudentDetail(params.id);
  return json(detail);
});

export const PATCH = handler<{ id: string }>(async (req, { user, params }) => {
  const admin = requireAdmin(user);
  const { status } = await parseBody(req, userStatusSchema);
  const updated = await setUserStatus(admin.id, params.id, status);
  return json({ user: { id: updated.id, status: updated.status } });
});
