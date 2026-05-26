import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createAlertSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import enMessages from "@/i18n/messages/en.json";
import nbMessages from "@/i18n/messages/nb.json";

function isAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "owner";
}

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
    const parsed = createAlertSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { personAliasId, isAnonymous, message, notifyAll } = parsed.data;

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

    const isAdmin = isAdminRole(membership.role);

    if (notifyAll && !isAdmin) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (!isAdmin && personAlias.userId !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    let reportingUser: { id: string; displayName: string | null; email: string } | null = null;
    if (personAlias.userId) {
      reportingUser = await prisma.user.findUnique({
        where: { id: personAlias.userId },
        select: { id: true, displayName: true, email: true },
      });
    }

    if (isAdmin && !personAlias.userId) {
      return NextResponse.json({ error: "Selected member not linked" }, { status: 400 });
    }

    if (isAdmin && personAlias.userId) {
      const targetMembership = await prisma.groupMembership.findUnique({
        where: {
          userId_groupId: { userId: personAlias.userId, groupId: personAlias.groupId },
          deletedAt: null,
        },
      });

      if (!targetMembership) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      }
    }

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    await prisma.exposureAlert.updateMany({
      where: { groupId: personAlias.groupId, createdAt: { lt: oneYearAgo }, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    // Create exposure alert
    const alert = await prisma.exposureAlert.create({
      data: {
        groupId: personAlias.groupId,
        createdById: user.id,
        personAliasId,
        isAnonymous,
        notifyAll: !!notifyAll,
        message,
      },
    });

    // Collect user IDs to notify
    const userIdsToNotify = new Set<string>();

    if (notifyAll && isAdmin) {
      const members = await prisma.groupMembership.findMany({
        where: { groupId: personAlias.groupId, deletedAt: null, user: { deletedAt: null } },
        select: { userId: true },
      });
      for (const member of members) {
        if (member.userId !== user.id) {
          userIdsToNotify.add(member.userId);
        }
      }
    } else {
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

      for (const rel of relationships) {
        const connectedPerson =
          rel.personAId === personAliasId ? rel.personB : rel.personA;
        if (connectedPerson.userId && connectedPerson.userId !== user.id) {
          userIdsToNotify.add(connectedPerson.userId);
        }
      }
    }

    // Create notifications
    const recipients = Array.from(userIdsToNotify);
    const recipientUsers = recipients.length
      ? await prisma.user.findMany({
          where: { id: { in: recipients } },
          select: { id: true, locale: true },
        })
      : [];

    const notifications = recipientUsers.map((recipient) => {
      const messages = getMessages(recipient.locale);
      const reporterName = reportingUser?.displayName || reportingUser?.email || messages.notifications.memberFallback;
      return {
        userId: recipient.id,
        type: "exposure_alert",
        title: messages.notifications.exposureTitle,
        body: isAnonymous
          ? messages.notifications.exposureBodyAnonymous
          : messages.notifications.exposureBodyIdentified.replace("{name}", reporterName),
        metadata: {
          alertId: alert.id,
          groupId: personAlias.groupId,
          message: message || null,
          isAnonymous,
          reportedBy: isAnonymous ? null : reporterName,
        },
      };
    });

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications });
    }

    await createAuditLog({
      userId: user.id,
      action: "create_alert",
      resource: "exposure_alert",
      resourceId: alert.id,
      metadata: { isAnonymous, notifiedCount: userIdsToNotify.size, notifyAll: !!notifyAll },
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
