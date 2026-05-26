import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

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
    include: {
      personA: true,
      personB: true,
    },
  });

  if (!relationship) {
    return NextResponse.json({ error: "Relationship not found" }, { status: 404 });
  }

  // Check user is linked to one of the persons in the relationship
  const userPersonAlias = await prisma.personAlias.findFirst({
    where: {
      userId: user.id,
      groupId: relationship.groupId,
      deletedAt: null,
      id: { in: [relationship.personAId, relationship.personBId] },
    },
  });

  if (!userPersonAlias) {
    return NextResponse.json(
      { error: "You must be one of the persons in this relationship to verify it" },
      { status: 403 }
    );
  }

  // Check if already verified
  const existingConfirmation = await prisma.relationshipConfirmation.findUnique({
    where: {
      relationshipEventId_personAliasId: {
        relationshipEventId: relationshipId,
        personAliasId: userPersonAlias.id,
      },
    },
  });

  if (existingConfirmation) {
    return NextResponse.json(
      { error: "Relationship already confirmed" },
      { status: 409 }
    );
  }

  const confirmation = await prisma.relationshipConfirmation.create({
    data: {
      relationshipEventId: relationshipId,
      personAliasId: userPersonAlias.id,
    },
  });

  await createAuditLog({
    userId: user.id,
    action: "verify_relationship",
    resource: "relationship",
    resourceId: relationshipId,
    ipAddress: request.headers.get("x-forwarded-for") || "unknown",
  });

  return NextResponse.json({ confirmation }, { status: 201 });
}
