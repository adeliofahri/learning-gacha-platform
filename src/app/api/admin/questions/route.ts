import { handler, json, parseBody } from "@/lib/http";
import { questionSchema } from "@/lib/validation/learning";
import { requireAdmin } from "@/server/policies";
import { createQuestion, listQuestionsAdmin } from "@/server/services/learning.service";
import { clampPage } from "@/lib/utils";

export const GET = handler(async (req, { user }) => {
  requireAdmin(user);
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status");
  const result = await listQuestionsAdmin({
    search: sp.get("q") ?? undefined,
    status: status === "DRAFT" || status === "PUBLISHED" || status === "ARCHIVED" ? status : undefined,
    page: clampPage(sp.get("page") ?? undefined),
    pageSize: 50,
  });
  return json({
    total: result.total,
    items: result.items.map((q) => ({
      id: q.id,
      title: q.title,
      type: q.type,
      difficulty: q.difficulty,
      status: q.status,
      subject: q.subject.name,
    })),
  });
});

export const POST = handler(async (req, { user }) => {
  const admin = requireAdmin(user);
  const input = await parseBody(req, questionSchema);
  return json({ question: await createQuestion(admin.id, input) }, { status: 201 });
});
