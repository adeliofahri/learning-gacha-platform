import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_MIME, UPLOAD_NAME_RE, uploadDir } from "@/server/services/upload.service";

/** Menyajikan gambar karakter hasil upload. Nama file divalidasi ketat (tanpa path traversal). */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!UPLOAD_NAME_RE.test(file)) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(path.join(uploadDir(), file));
    const ext = file.split(".").pop()!;
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": UPLOAD_MIME[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
