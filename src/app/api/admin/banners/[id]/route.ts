import { handler, json, parseBody } from "@/lib/http";
import { bannerSchema } from "@/lib/validation/collection";
import { requireAdmin } from "@/server/policies";
import { updateBanner } from "@/server/services/banner.service";

export const PUT = handler<{ id: string }>(async (req, { user, params }) => {
  const admin = requireAdmin(user);
  const input = await parseBody(req, bannerSchema);
  return json({ banner: await updateBanner(admin.id, params.id, input) });
});
