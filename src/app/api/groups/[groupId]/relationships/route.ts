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

  const userPersonAlias = await prisma.personAlias.findFirst({
    where: {
      userId: user.id,
      groupId,
      deletedAt: null,
    },
    select: { id: true },
  });

  const relationships = await prisma.relationshipEvent.findMany({
    where: { groupId, deletedAt: null },
    include: {
      personA: { select: { id: true, alias: true } },
      personB: { select: { id: true, alias: true } },
      confirmations: { select: { personAliasId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const relationshipsWithStatus = relationships.map((rel) => {
    const confirmations = rel.confirmations.map((c) => c.personAliasId);
    const confirmationsCount = confirmations.length;
    const status = confirmationsCount >= 2
      ? "verified"
      : confirmationsCount === 1
        ? "pending"
        : "unverified";
    const confirmedByMe = userPersonAlias
      ? confirmations.includes(userPersonAlias.id)
      : false;
    return {
      ...rel,
      status,
      confirmationsCount,
      confirmedByMe,
    };
  });

  return NextResponse.json({ relationships: relationshipsWithStatus });
}
