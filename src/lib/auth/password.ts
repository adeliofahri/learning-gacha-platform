import { hash, verify } from "@node-rs/argon2";

// Argon2id (algorithm: 2) — parameter mengikuti rekomendasi OWASP (m=19 MiB, t=2, p=1).
const OPTIONS = { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;
/** Dipakai saat user tidak ditemukan agar waktu respons login tetap mirip (mitigasi user enumeration). */
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword("dummy-password-for-timing");
  await verifyPassword(await dummyHash, password);
}
