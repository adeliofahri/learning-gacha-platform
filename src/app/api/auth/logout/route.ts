import { NextResponse } from "next/server";
import { handler } from "@/lib/http";
import { deleteSession, readSessionToken } from "@/lib/auth/session";
import { SESSION_COOKIE } from "@/lib/constants";

export const POST = handler(async (req) => {
  await deleteSession(readSessionToken(req));
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: SESSION_COOKIE, value: "", path: "/", maxAge: 0, httpOnly: true, sameSite: "lax" });
  return res;
});
