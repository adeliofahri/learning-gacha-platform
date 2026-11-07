"use client";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

/** Fetch JSON ke API internal. `idempotencyKey` dikirim untuk operasi rawan retry (jawab soal, gacha). */
export async function apiFetch<T = unknown>(
  url: string,
  options: { method?: string; body?: unknown; idempotencyKey?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (options.idempotencyKey) headers["idempotency-key"] = options.idempotencyKey;
  let res: Response;
  try {
    res = await fetch(url, {
      method: options.method ?? "POST",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("Tidak dapat terhubung ke server. Periksa koneksi internet kamu.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (data as { error?: { message?: string; details?: unknown } }).error;
    throw new ApiError(err?.message ?? "Terjadi kesalahan", res.status, err?.details);
  }
  return data as T;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (Array.isArray(e.details) && e.details.length)
      return `${e.message}: ${e.details.join("; ")}`;
    return e.message;
  }
  return "Terjadi kesalahan tak terduga";
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}
