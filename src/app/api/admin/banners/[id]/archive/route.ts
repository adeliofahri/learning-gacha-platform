import { handler, json } from "@/lib/http";
import { requireAdmin } from "@/server/policies";
import { archiveBanner } from "@/server/services/banner.service";

export const POST = handler<{ id: string }>(async (_req, { user, params }) => {
  const admin = requireAdmin(user);
  return json({ banner: await archiveBanner(admin.id, params.id) });
});
