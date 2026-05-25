import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, destroySession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Soft delete: mark user as deleted
    await prisma.user.update({
      where: { id: user.id },
      data: { deletedAt: new Date() },
    });

    // Soft delete all memberships
    await prisma.groupMembership.updateMany({
      where: { userId: user.id },
      data: { deletedAt: new Date() },
    });

    // Soft delete person aliases
    await prisma.personAlias.updateMany({
      where: { userId: user.id },
      data: { deletedAt: new Date() },
    });

    // Delete all sessions
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    await createAuditLog({
      userId: user.id,
      action: "delete_account",
      resource: "user",
      resourceId: user.id,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    });

    const token = request.cookies.get("session")?.value;
    if (token) {
      await destroySession(token);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete("session");
    return response;
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
