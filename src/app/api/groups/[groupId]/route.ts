import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

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
