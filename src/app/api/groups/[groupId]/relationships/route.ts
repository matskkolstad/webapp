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
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const relationships = await prisma.relationshipEvent.findMany({
    where: { groupId, deletedAt: null },
    include: {
      personA: { select: { id: true, alias: true } },
      personB: { select: { id: true, alias: true } },
      verification: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ relationships });
}
