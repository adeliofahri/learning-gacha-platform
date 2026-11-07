import { handler, json, parseBody } from "@/lib/http";
import { bannerSchema } from "@/lib/validation/collection";
import { requireAdmin } from "@/server/policies";
import { createBanner } from "@/server/services/banner.service";

export const POST = handler(async (req, { user }) => {
  const admin = requireAdmin(user);
  const input = await parseBody(req, bannerSchema);
  return json({ banner: await createBanner(admin.id, input) }, { status: 201 });
});
