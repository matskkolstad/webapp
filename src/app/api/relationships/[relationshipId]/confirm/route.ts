import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

function isAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "owner";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ relationshipId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { relationshipId } = await params;

  const relationship = await prisma.relationshipEvent.findUnique({
    where: { id: relationshipId, deletedAt: null },
    select: { id: true, groupId: true, personAId: true, personBId: true },
  });

  if (!relationship) {
    return NextResponse.json({ error: "Relationship not found" }, { status: 404 });
  }

  const membership = await prisma.groupMembership.findUnique({
    where: {
      userId_groupId: { userId: user.id, groupId: relationship.groupId },
      deletedAt: null,
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const userPersonAlias = await prisma.personAlias.findFirst({
    where: {
      userId: user.id,
      groupId: relationship.groupId,
      deletedAt: null,
      id: { in: [relationship.personAId, relationship.personBId] },
    },
    select: { id: true },
  });

  if (!userPersonAlias && !isAdminRole(membership.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    if (userPersonAlias) {
      await tx.relationshipConfirmation.upsert({
        where: {
          relationshipEventId_personAliasId: {
            relationshipEventId: relationship.id,
            personAliasId: userPersonAlias.id,
          },
        },
        update: { confirmedAt: new Date() },
        create: {
          relationshipEventId: relationship.id,
          personAliasId: userPersonAlias.id,
        },
      });
    } else {
      await tx.relationshipConfirmation.createMany({
        data: [
          { relationshipEventId: relationship.id, personAliasId: relationship.personAId },
          { relationshipEventId: relationship.id, personAliasId: relationship.personBId },
        ],
        skipDuplicates: true,
      });
    }
  });

  await createAuditLog({
    userId: user.id,
    action: "confirm_relationship",
    resource: "relationship",
    resourceId: relationship.id,
    ipAddress: request.headers.get("x-forwarded-for") || "unknown",
  });

  return NextResponse.json({ success: true });
}
