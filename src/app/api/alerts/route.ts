import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createAlertSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createAlertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { personAliasId, isAnonymous, message } = parsed.data;

    // Find the person alias and verify membership
    const personAlias = await prisma.personAlias.findUnique({
      where: { id: personAliasId, deletedAt: null },
    });

    if (!personAlias) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    const membership = await prisma.groupMembership.findUnique({
      where: {
        userId_groupId: { userId: user.id, groupId: personAlias.groupId },
        deletedAt: null,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    // Create exposure alert
    const alert = await prisma.exposureAlert.create({
      data: {
        groupId: personAlias.groupId,
        createdById: user.id,
        personAliasId,
        isAnonymous,
        message,
      },
    });

    // Find connected persons via relationships
    const relationships = await prisma.relationshipEvent.findMany({
      where: {
        groupId: personAlias.groupId,
        deletedAt: null,
        OR: [
          { personAId: personAliasId },
          { personBId: personAliasId },
        ],
      },
      include: {
        personA: { select: { id: true, userId: true, alias: true } },
        personB: { select: { id: true, userId: true, alias: true } },
      },
    });

    // Collect user IDs to notify
    const userIdsToNotify = new Set<string>();
    for (const rel of relationships) {
      const connectedPerson =
        rel.personAId === personAliasId ? rel.personB : rel.personA;
      if (connectedPerson.userId && connectedPerson.userId !== user.id) {
        userIdsToNotify.add(connectedPerson.userId);
      }
    }

    // Create notifications
    const notifications = Array.from(userIdsToNotify).map((userId) => ({
      userId,
      type: "exposure_alert",
      title: "Exposure Alert / Smittevarsel",
      body: isAnonymous
        ? "Someone in your network has reported a potential exposure."
        : `${user.displayName || "A member"} has reported a potential exposure.`,
      metadata: { alertId: alert.id, groupId: personAlias.groupId },
    }));

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }

    await createAuditLog({
      userId: user.id,
      action: "create_alert",
      resource: "exposure_alert",
      resourceId: alert.id,
      metadata: { isAnonymous, notifiedCount: userIdsToNotify.size },
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    });

    return NextResponse.json(
      { alert, notifiedCount: userIdsToNotify.size },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create alert error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
