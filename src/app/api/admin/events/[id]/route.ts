import { handler, json, parseBody } from "@/lib/http";
import { eventSchema } from "@/lib/validation/economy";
import { requireAdmin } from "@/server/policies";
import { updateEvent } from "@/server/services/event.service";

export const PUT = handler<{ id: string }>(async (req, { user, params }) => {
  const admin = requireAdmin(user);
  const input = await parseBody(req, eventSchema);
  return json({ event: await updateEvent(admin.id, params.id, input) });
});
