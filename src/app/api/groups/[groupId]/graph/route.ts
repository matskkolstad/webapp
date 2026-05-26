import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  request: NextRequest,
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

  const searchParams = request.nextUrl.searchParams;
  const verifiedOnly = searchParams.get("verifiedOnly") === "true";
  const fromDate = searchParams.get("from");
  const toDate = searchParams.get("to");
  const protectionFilter = searchParams.get("protection");

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: any = {
    groupId,
    deletedAt: null,
  };

  if (verifiedOnly) {
    // Filter after computing status to ensure fully verified (2 confirmations)
  }

  if (fromDate || toDate) {
    whereClause.eventDate = {};
    if (fromDate) (whereClause.eventDate as Record<string, unknown>).gte = new Date(fromDate);
    if (toDate) (whereClause.eventDate as Record<string, unknown>).lte = new Date(toDate);
  }

  if (protectionFilter && ["protected", "unprotected", "unknown"].includes(protectionFilter)) {
    whereClause.protectionStatus = protectionFilter;
  }

  const [persons, relationships] = await Promise.all([
    prisma.personAlias.findMany({
      where: { groupId, deletedAt: null },
      select: { id: true, alias: true, userId: true },
    }),
    prisma.relationshipEvent.findMany({
      where: whereClause,
      include: {
        personA: { select: { id: true, alias: true } },
        personB: { select: { id: true, alias: true } },
        confirmations: { select: { personAliasId: true } },
      },
    }),
  ]);

  // Build graph data in Cytoscape format
  const nodes = persons.map((p) => ({
    data: {
      id: p.id,
      label: p.alias,
      isLinkedUser: !!p.userId,
    },
  }));

  let edges = relationships.map((r) => {
    const confirmationsCount = r.confirmations.length;
    const status = confirmationsCount >= 2
      ? "verified"
      : confirmationsCount === 1
        ? "pending"
        : "unverified";

    return {
      data: {
        id: r.id,
        source: r.personAId,
        target: r.personBId,
        status,
        protectionStatus: r.protectionStatus,
        eventDate: r.eventDate?.toISOString(),
      },
    };
  });

  if (verifiedOnly) {
    edges = edges.filter((edge) => edge.data.status === "verified");
  }

  return NextResponse.json({ nodes, edges });
}
