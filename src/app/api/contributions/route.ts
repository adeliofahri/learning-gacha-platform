import { z } from "zod";
import { handler, json, parseBody } from "@/lib/http";
import { requireStudent } from "@/server/policies";
import { contributionSubmissionSchema } from "@/lib/validation/contribution";
import { createContributionSubmission, getContributionDashboard } from "@/server/services/contribution.service";

export const GET = handler(async (_req, { user }) => {
  const student = requireStudent(user);
  return json({ dashboard: await getContributionDashboard(student.id) });
});

export const POST = handler(async (req, { user }) => {
  const student = requireStudent(user);
  const input = await parseBody<z.infer<typeof contributionSubmissionSchema>>(
    req,
    contributionSubmissionSchema,
  );
  const submission = await createContributionSubmission(student.id, input.type, input.content);
  return json({ submission }, { status: 201 });
});
