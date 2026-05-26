import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function isAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "owner";
}

export async function GET(
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
    return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
  }

  const group = await prisma.group.findUnique({
    where: { id: groupId, deletedAt: null },
    include: {
      memberships: {
        where: { deletedAt: null },
        include: {
          user: {
            select: { id: true, displayName: true, email: true },
          },
        },
      },
      _count: {
        select: {
          personAliases: { where: { deletedAt: null } },
          relationshipEvents: { where: { deletedAt: null } },
          memberships: { where: { deletedAt: null } },
        },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  return NextResponse.json({
    group: {
      ...group,
      currentUserRole: membership.role,
    },
  });
}

export async function DELETE(
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

  if (!membership || !isAdminRole(membership.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.group.update({
      where: { id: groupId },
      data: { deletedAt: new Date() },
    });
    await tx.groupMembership.updateMany({
      where: { groupId },
      data: { deletedAt: new Date() },
    });
    await tx.personAlias.updateMany({
      where: { groupId },
      data: { deletedAt: new Date(), userId: null },
    });
    await tx.relationshipEvent.updateMany({
      where: { groupId },
      data: { deletedAt: new Date() },
    });
    await tx.relationshipVerification.deleteMany({
      where: {
        relationshipEvent: {
          groupId,
        },
      },
    });
    await tx.exposureAlert.updateMany({
      where: { groupId },
      data: { deletedAt: new Date() },
    });
    await tx.inviteCode.updateMany({
      where: { groupId },
      data: { deletedAt: new Date() },
    });
  });

  return NextResponse.json({ success: true });
}
