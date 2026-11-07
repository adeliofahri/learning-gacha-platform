import { handler, json, parseBody } from "@/lib/http";
import { difficultySettingsSchema } from "@/lib/validation/learning";
import { requireAdmin } from "@/server/policies";
import { updateEconomySettings } from "@/server/services/admin.service";

export const PUT = handler(async (req, { user }) => {
  const admin = requireAdmin(user);
  const input = await parseBody(req, difficultySettingsSchema);
  await updateEconomySettings(admin.id, input);
  return json({ ok: true });
});
