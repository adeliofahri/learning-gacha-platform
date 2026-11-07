import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { BUILT_IN_CHARACTER_IMAGES } from "@/lib/constants/character-art";

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

export const UPLOAD_NAME_RE = /^[0-9]+-[a-f0-9]{16}\.(png|jpg|webp)$/;

/**
 * Menyimpan gambar ke database (tabel UploadedImage), bukan ke disk, agar tetap ada
 * di hosting serverless seperti Vercel. Disajikan oleh /uploads/characters/[file].
 */
export async function saveCharacterImage(file: File, adminId: string): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = validateImage(file, bytes);
  const filename = `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
  await prisma.uploadedImage.create({
    data: { filename, mimeType: file.type, size: bytes.length, data: bytes, createdById: adminId },
  });
  return `/uploads/characters/${filename}`;
}

export async function getUploadedImage(filename: string) {
  if (!UPLOAD_NAME_RE.test(filename)) return null;
  return prisma.uploadedImage.findUnique({
    where: { filename },
    select: { data: true, mimeType: true },
  });
}

/** Gambar bawaan (public/characters) + hasil upload, untuk dipilih admin. */
export async function libraryImages(): Promise<string[]> {
  const uploaded = await prisma.uploadedImage.findMany({
    select: { filename: true },
    orderBy: { createdAt: "desc" },
  });
  return [
    ...BUILT_IN_CHARACTER_IMAGES,
    ...uploaded.map((u) => `/uploads/characters/${u.filename}`),
  ];
}
