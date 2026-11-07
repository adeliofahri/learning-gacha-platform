import { handler, json, parseBody } from "@/lib/http";
import { adjustmentSchema } from "@/lib/validation/economy";
import { requireAdmin } from "@/server/policies";
import { adminAdjustCoins } from "@/server/services/wallet.service";

export const POST = handler<{ id: string }>(async (req, { user, params }) => {
  const admin = requireAdmin(user);
  const { amount, reason } = await parseBody(req, adjustmentSchema);
  const transaction = await adminAdjustCoins({ adminId: admin.id, userId: params.id, amount, reason });
  return json({ transaction }, { status: 201 });
});
