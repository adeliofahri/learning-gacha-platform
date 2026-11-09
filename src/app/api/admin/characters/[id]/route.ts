import { handler, json, parseBody } from "@/lib/http";
import { characterSchema } from "@/lib/validation/collection";
import { requireAdmin } from "@/server/policies";
import {
  updateCharacter,
  deleteCharacter,
} from "@/server/services/collection.service";

export const PUT = handler<{ id: string }>(async (req, { user, params }) => {
  const admin = requireAdmin(user);
  const input = await parseBody(req, characterSchema);

  return json({
    character: await updateCharacter(admin.id, params.id, input),
  });
});

export const DELETE = handler<{ id: string }>(async (_req, { user, params }) => {
  const admin = requireAdmin(user);

  return json({
    result: await deleteCharacter(admin.id, params.id),
  });
});