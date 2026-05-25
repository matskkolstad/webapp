import { NextRequest, NextResponse } from "next/server";
import { destroySession, getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("session")?.value;
  const user = await getCurrentUser();

  if (token) {
    await destroySession(token);
  }

  if (user) {
    await createAuditLog({
      userId: user.id,
      action: "logout",
      resource: "user",
      resourceId: user.id,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("session");
  return response;
}
