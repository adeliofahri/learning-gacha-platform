import { handler, json, parseBody } from "@/lib/http";
import { profileSchema } from "@/lib/validation/collection";
import { requireStudent } from "@/server/policies";
import { updateProfile } from "@/server/services/collection.service";

export const PATCH = handler(async (req, { user }) => {
  const student = requireStudent(user);
  const input = await parseBody(req, profileSchema);
  return json({ profile: await updateProfile(student.id, input) });
});
