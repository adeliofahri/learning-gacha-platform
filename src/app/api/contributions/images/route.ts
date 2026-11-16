import { handler, json } from "@/lib/http";
import { AppError } from "@/lib/errors";
import { requireStudent } from "@/server/policies";
import { saveCharacterImage, saveQuestionImage } from "@/server/services/upload.service";

export const POST = handler(async (req, { user }) => {
  const student = requireStudent(user);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new AppError("BAD_REQUEST", "Request harus multipart/form-data");
  }
  const file = form.get("file");
  const kind = form.get("kind");
  if (!(file instanceof File)) throw new AppError("BAD_REQUEST", "File gambar wajib diunggah");
  if (kind !== "QUESTION" && kind !== "CHARACTER") {
    throw new AppError("BAD_REQUEST", "Jenis gambar tidak valid");
  }
  const url = kind === "QUESTION"
    ? await saveQuestionImage(file, student.id)
    : await saveCharacterImage(file, student.id);
  return json({ url }, { status: 201 });
});
