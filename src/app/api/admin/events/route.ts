import { handler, json, parseBody } from "@/lib/http";
import { eventSchema } from "@/lib/validation/economy";
import { requireAdmin } from "@/server/policies";
import { createEvent } from "@/server/services/event.service";

export const POST = handler(async (req, { user }) => {
  const admin = requireAdmin(user);
  const input = await parseBody(req, eventSchema);
  return json({ event: await createEvent(admin.id, input) }, { status: 201 });
});
