import { NextResponse, type NextRequest } from "next/server";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const SESSION_COOKIE = "lgp_session";
const PROTECTED_PREFIXES = [
  "/admin",
  "/dashboard",
  "/learn",
  "/packages",
  "/gacha",
  "/collection",
  "/profile",
  "/wallet",
  "/events",
];

function forbidden() {
  return NextResponse.json(
    { error: { code: "FORBIDDEN", message: "Origin request tidak valid" } },
    { status: 403 },
  );
}

/**
 * 1) Proteksi CSRF: request yang mengubah data ke /api wajib berasal dari origin yang sama
 *    (dikombinasikan dengan cookie sesi SameSite=Lax).
 * 2) Redirect cepat ke /login bila halaman terproteksi dibuka tanpa cookie sesi.
 *    Validasi sesi & role yang sebenarnya tetap dilakukan di server (layout/page/route handler).
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (!MUTATING.has(req.method)) return NextResponse.next();
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (!origin || !host) return forbidden();
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      return forbidden();
    }
    return originHost === host ? NextResponse.next() : forbidden();
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (isProtected && !req.cookies.get(SESSION_COOKIE)?.value) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/:path*",
    "/admin/:path*",
    "/dashboard/:path*",
    "/learn/:path*",
    "/packages/:path*",
    "/gacha/:path*",
    "/collection/:path*",
    "/profile/:path*",
    "/wallet/:path*",
    "/events/:path*",
  ],
};
