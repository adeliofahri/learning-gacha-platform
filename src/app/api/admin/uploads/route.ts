import { handler, json } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { requireAdmin } from "@/server/policies";
import { saveCharacterImage } from "@/server/services/upload.service";
import { logAudit } from "@/server/services/audit.service";
import { prisma } from "@/lib/db";

export const POST = handler(async (req, { user }) => {
  const admin = requireAdmin(user);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new AppError("BAD_REQUEST", "Request harus multipart/form-data");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new AppError("BAD_REQUEST", "File gambar wajib diunggah");
  const url = await saveCharacterImage(file);
  await logAudit(prisma, {
    actorId: admin.id,
    action: "UPLOAD_IMAGE",
    targetType: "Upload",
    targetId: url,
    metadata: { size: file.size, type: file.type },
  });
  return json({ url }, { status: 201 });
});
