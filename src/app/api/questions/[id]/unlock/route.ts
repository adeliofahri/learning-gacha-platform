import { handler, json } from "@/lib/http";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { requireStudent } from "@/server/policies";
import { unlockQuestionCooldown } from "@/server/services/learning.service";

export const POST = handler<{ id: string }>(
  async (_req, { user, params }) => {
    const student = requireStudent(user);

    await enforceRateLimit(
      "answer",
      student.id,
      RATE_LIMITS.answer,
    );

    const result = await unlockQuestionCooldown({
      userId: student.id,
      questionId: params.id,
    });

    return json(result);
  },
);