import { handler, json, parseBody } from "@/lib/http";
import { rarityStyleSchema } from "@/lib/validation/learning";
import { requireAdmin } from "@/server/policies";
import {
  getRarityStyles,
  updateRarityStyle,
} from "@/server/services/admin.service";

export const GET = handler(async (_req, { user }) => {
  requireAdmin(user);
  return json({ styles: await getRarityStyles() });
});

export const PUT = handler(async (req, { user }) => {
  const admin = requireAdmin(user);
  const input = await parseBody(req, rarityStyleSchema);

  await updateRarityStyle(admin.id, input);

  return json({ ok: true });
});