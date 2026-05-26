import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function isAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "owner";
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ groupId: string; relationshipId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { groupId, relationshipId } = await params;

  const membership = await prisma.groupMembership.findUnique({
    where: {
      userId_groupId: { userId: user.id, groupId },
      deletedAt: null,
    },
  });

  if (!membership || !isAdminRole(membership.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const relationship = await prisma.relationshipEvent.findFirst({
    where: { id: relationshipId, groupId, deletedAt: null },
  });

  if (!relationship) {
    return NextResponse.json({ error: "Relationship not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.relationshipVerification.deleteMany({
      where: { relationshipEventId: relationship.id },
    });
    await tx.relationshipEvent.update({
      where: { id: relationship.id },
      data: { deletedAt: new Date() },
    });
  });

  return NextResponse.json({ success: true });
}
