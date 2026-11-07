import { NextResponse, type NextRequest } from "next/server";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Proteksi CSRF: request yang mengubah data ke /api wajib berasal dari origin yang sama.
 * Dikombinasikan dengan cookie sesi SameSite=Lax.
 */
export function middleware(req: NextRequest) {
  if (!MUTATING.has(req.method)) return NextResponse.next();
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Origin request tidak valid" } },
      { status: 403 },
    );
  }
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    originHost = "";
  }
  if (originHost !== host) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Origin request tidak valid" } },
      { status: 403 },
    );
  }
  return NextResponse.next();
}

export const config = { matcher: "/api/:path*" };
