import { z } from "zod";
import { handler, json, parseBody } from "@/lib/http";
import { requireAdmin } from "@/server/policies";
import { approveContribution, rejectContribution } from "@/server/services/contribution.service";

const actionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  content: z.unknown().optional(),
}).strict();

export const POST = handler<{ id: string }>(async (req, { user, params }) => {
  const admin = requireAdmin(user);
  const input = await parseBody(req, actionSchema);
  if (input.action === "REJECT") {
    return json({ result: await rejectContribution(params.id) });
  }
  return json({ result: await approveContribution(admin.id, params.id, input.content) });
});
