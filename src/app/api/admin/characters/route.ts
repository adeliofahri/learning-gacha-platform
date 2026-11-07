import { handler, json, parseBody } from "@/lib/http";
import { characterSchema } from "@/lib/validation/collection";
import { requireAdmin } from "@/server/policies";
import { createCharacter } from "@/server/services/collection.service";

export const POST = handler(async (req, { user }) => {
  const admin = requireAdmin(user);
  const input = await parseBody(req, characterSchema);
  return json({ character: await createCharacter(admin.id, input) }, { status: 201 });
});
