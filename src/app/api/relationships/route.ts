import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createRelationshipSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createRelationshipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { personAId, personBId, eventDate, protectionStatus, notes } = parsed.data;

    if (personAId === personBId) {
      return NextResponse.json(
        { error: "Cannot create a relationship with the same person" },
        { status: 400 }
      );
    }

    // Verify both persons exist and are in the same group
    const [personA, personB] = await Promise.all([
      prisma.personAlias.findUnique({ where: { id: personAId, deletedAt: null } }),
      prisma.personAlias.findUnique({ where: { id: personBId, deletedAt: null } }),
    ]);

    if (!personA || !personB) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    if (personA.groupId !== personB.groupId) {
      return NextResponse.json(
        { error: "Persons must be in the same group" },
        { status: 400 }
      );
    }

    // Verify user is a member of the group
    const membership = await prisma.groupMembership.findUnique({
      where: {
        userId_groupId: { userId: user.id, groupId: personA.groupId },
        deletedAt: null,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    const relationship = await prisma.relationshipEvent.create({
      data: {
        groupId: personA.groupId,
        personAId,
        personBId,
        eventDate: eventDate ? new Date(eventDate) : null,
        protectionStatus,
        notes,
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "create_relationship",
      resource: "relationship",
      resourceId: relationship.id,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    });

    return NextResponse.json({ relationship }, { status: 201 });
  } catch (error) {
    console.error("Create relationship error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
