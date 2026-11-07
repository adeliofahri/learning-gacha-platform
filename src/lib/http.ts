import { NextResponse } from "next/server";
import { ZodError, type ZodType, type ZodTypeDef } from "zod";
import { AppError } from "@/lib/errors";
import { getRequestUser, type SessionUser } from "@/lib/auth/session";

export type RouteContext<P = Record<string, string>> = { params: Promise<P> };

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: error.issues[0]?.message ?? "Input tidak valid",
          details: error.flatten(),
        },
      },
      { status: 400 },
    );
  }
  console.error("[api] unexpected error", error);
  return NextResponse.json(
    { error: { code: "INTERNAL", message: "Terjadi kesalahan pada server" } },
    { status: 500 },
  );
}

/** Wrapper Route Handler: resolve user sesi, tangkap error → response JSON konsisten. */
export function handler<P = Record<string, string>>(
  fn: (req: Request, ctx: { user: SessionUser | null; params: P }) => Promise<Response>,
) {
  return async (req: Request, context?: RouteContext<P>): Promise<Response> => {
    try {
      const user = await getRequestUser(req);
      const params = (context ? await context.params : {}) as P;
      return await fn(req, { user, params });
    } catch (error) {
      return errorResponse(error);
    }
  };
}

export async function parseBody<T>(req: Request, schema: ZodType<T, ZodTypeDef, unknown>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new AppError("BAD_REQUEST", "Body harus berupa JSON yang valid");
  }
  return schema.parse(raw);
}

const IDEMPOTENCY_RE = /^[A-Za-z0-9_-]{8,100}$/;

export function requireIdempotencyKey(req: Request): string {
  const key = req.headers.get("idempotency-key");
  if (!key || !IDEMPOTENCY_RE.test(key)) {
    throw new AppError("BAD_REQUEST", "Header Idempotency-Key wajib diisi (8-100 karakter)");
  }
  return key;
}
