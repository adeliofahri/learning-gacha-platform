import { handler, json, parseBody } from "@/lib/http";
import { characterSchema } from "@/lib/validation/collection";
import { requireAdmin } from "@/server/policies";
import { updateCharacter } from "@/server/services/collection.service";

export const PUT = handler<{ id: string }>(async (req, { user, params }) => {
  const admin = requireAdmin(user);
  const input = await parseBody(req, characterSchema);
  return json({ character: await updateCharacter(admin.id, params.id, input) });
});
