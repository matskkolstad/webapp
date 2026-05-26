import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { groupId } = await params;

  const membership = await prisma.groupMembership.findUnique({
    where: {
      userId_groupId: { userId: user.id, groupId },
      deletedAt: null,
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  if (membership.role === "admin" || membership.role === "owner") {
    const otherAdmins = await prisma.groupMembership.count({
      where: {
        groupId,
        deletedAt: null,
        role: { in: ["admin", "owner"] },
        userId: { not: user.id },
      },
    });

    if (otherAdmins === 0) {
      return NextResponse.json({ error: "Cannot remove the last admin" }, { status: 409 });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.groupMembership.update({
      where: { id: membership.id },
      data: { deletedAt: new Date() },
    });

    await tx.personAlias.updateMany({
      where: { groupId, userId: user.id },
      data: { userId: null },
    });
  });

  return NextResponse.json({ success: true });
}
