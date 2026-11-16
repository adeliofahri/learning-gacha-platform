import { handler, json } from "@/lib/http";
import { requireAdmin } from "@/server/policies";
import { listPendingContributions } from "@/server/services/contribution.service";
import { clampPage } from "@/lib/utils";

export const GET = handler(async (req, { user }) => {
  requireAdmin(user);
  const page = clampPage(new URL(req.url).searchParams.get("page") ?? undefined);
  const result = await listPendingContributions(page, 20);
  return json(result);
});
