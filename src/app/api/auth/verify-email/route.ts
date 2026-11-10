import { NextResponse } from "next/server";
import { handler, parseBody } from "@/lib/http";
import { verifyEmailSchema } from "@/lib/validation/auth";
import { verifyEmail } from "@/server/services/auth.service";

export const POST = handler(async (req) => {
  const input = await parseBody(req, verifyEmailSchema);

  await verifyEmail(input.token);

  return NextResponse.json({
    message: "Email berhasil diverifikasi. Silakan login.",
  });
});