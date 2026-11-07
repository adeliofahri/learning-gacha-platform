import { randomBytes } from "node:crypto";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "@/lib/errors";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";

const SIGNATURES: { mime: string; ext: string; check: (b: Buffer) => boolean }[] = [
  {
    mime: "image/png",
    ext: "png",
    check: (b) =>
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  { mime: "image/jpeg", ext: "jpg", check: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: "image/webp",
    ext: "webp",
    check: (b) =>
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

/** Validasi tipe (MIME + magic bytes), ukuran, dan nama file acak. SVG ditolak (XSS). */
export function validateImage(file: { type: string; size: number }, bytes: Buffer) {
  if (file.size <= 0 || bytes.length === 0) throw new AppError("BAD_REQUEST", "File kosong");
  if (file.size > MAX_UPLOAD_BYTES || bytes.length > MAX_UPLOAD_BYTES) {
    throw new AppError("BAD_REQUEST", "Ukuran file maksimal 2 MB");
  }
  const sig = SIGNATURES.find((s) => s.mime === file.type);
  if (!sig) throw new AppError("BAD_REQUEST", "Tipe file harus PNG, JPEG, atau WebP");
  if (!sig.check(bytes))
    throw new AppError("BAD_REQUEST", "Isi file tidak sesuai dengan tipe gambar");
  return sig.ext;
}

export function uploadDir() {
  return path.join(process.cwd(), "storage", "uploads", "characters");
}

export const UPLOAD_NAME_RE = /^[0-9]+-[a-f0-9]{16}\.(png|jpg|webp)$/;
export const UPLOAD_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

export async function saveCharacterImage(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = validateImage(file, bytes);
  const name = `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
  const dir = uploadDir();
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes, { flag: "wx" });
  return `/uploads/characters/${name}`;
}

/** Gambar bawaan di public/characters + hasil upload, untuk dipilih admin. */
export async function libraryImages(): Promise<string[]> {
  const builtIn = await readdir(path.join(process.cwd(), "public", "characters")).catch(
    () => [] as string[],
  );
  const uploaded = await readdir(uploadDir()).catch(() => [] as string[]);
  return [
    ...builtIn.filter((f) => /\.(svg|png|jpe?g|webp)$/.test(f)).map((f) => `/characters/${f}`),
    ...uploaded.filter((f) => UPLOAD_NAME_RE.test(f)).map((f) => `/uploads/characters/${f}`),
  ];
}
