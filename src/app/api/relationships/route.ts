import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createRelationshipSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import enMessages from "@/i18n/messages/en.json";
import nbMessages from "@/i18n/messages/nb.json";

function getMessages(locale?: string | null) {
  return locale === "nb" ? nbMessages : enMessages;
}

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

    let { personAId, personBId, eventDate, protectionStatus, notes } = parsed.data;

    if (personAId === personBId) {
      return NextResponse.json(
        { error: "Cannot create a relationship with the same person" },
        { status: 400 }
      );
    }

    if (personAId.localeCompare(personBId) > 0) {
      [personAId, personBId] = [personBId, personAId];
    }

    // Verify both persons exist and are in the same group
    const [personA, personB] = await Promise.all([
      prisma.personAlias.findUnique({
        where: { id: personAId, deletedAt: null },
        select: { id: true, alias: true, groupId: true, userId: true },
      }),
      prisma.personAlias.findUnique({
        where: { id: personBId, deletedAt: null },
        select: { id: true, alias: true, groupId: true, userId: true },
      }),
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

    const existingRelationship = await prisma.relationshipEvent.findFirst({
      where: {
        groupId: personA.groupId,
        deletedAt: null,
        OR: [
          { personAId, personBId },
          { personAId: personBId, personBId: personAId },
        ],
      },
      select: { id: true },
    });

    if (existingRelationship) {
      return NextResponse.json(
        { error: "Relationship already exists" },
        { status: 409 }
      );
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

    const notificationRecipients = [personA, personB]
      .filter((p) => p.userId && p.userId !== user.id)
      .map((p) => p.userId as string);

    if (notificationRecipients.length > 0) {
      const recipientUsers = await prisma.user.findMany({
        where: { id: { in: notificationRecipients } },
        select: { id: true, locale: true },
      });

      await prisma.notification.createMany({
        data: recipientUsers.map((recipient) => {
          const messages = getMessages(recipient.locale);
          return {
            userId: recipient.id,
          type: "relationship_request",
            title: messages.notifications.relationshipRequestTitle,
          body: `${personA.alias} & ${personB.alias}`,
          metadata: {
            relationshipId: relationship.id,
            groupId: personA.groupId,
            personAId: personA.id,
            personBId: personB.id,
          },
          };
        }),
      });
    }

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
