import { handler, json } from "@/lib/http";
import { requireAdmin } from "@/server/policies";
import { publishBanner } from "@/server/services/banner.service";

export const POST = handler<{ id: string }>(async (_req, { user, params }) => {
  const admin = requireAdmin(user);
  return json({ banner: await publishBanner(admin.id, params.id) });
});
