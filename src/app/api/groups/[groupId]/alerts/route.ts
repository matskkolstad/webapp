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
    where: { userId_groupId: { userId: user.id, groupId }, deletedAt: null },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  await prisma.exposureAlert.updateMany({
    where: { groupId, createdAt: { lt: oneYearAgo }, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  const myAlias = await prisma.personAlias.findFirst({
    where: { groupId, userId: user.id, deletedAt: null },
    select: { id: true },
  });

  const alerts = await prisma.exposureAlert.findMany({
    where: { groupId, deletedAt: null, createdAt: { gte: oneYearAgo } },
    include: {
      createdBy: { select: { id: true, displayName: true, email: true } },
      personAlias: { select: { id: true, alias: true, userId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  let relatedPersonIds = new Set<string>();
  if (myAlias) {
    const relationships = await prisma.relationshipEvent.findMany({
      where: {
        groupId,
        deletedAt: null,
        OR: [{ personAId: myAlias.id }, { personBId: myAlias.id }],
      },
      select: { personAId: true, personBId: true },
    });

    relatedPersonIds = new Set(
      relationships.map((rel) =>
        rel.personAId === myAlias.id ? rel.personBId : rel.personAId
      )
    );
  }

  const visibleAlerts = alerts.filter((alert) => {
    if (alert.createdById === user.id) return true;
    if (alert.notifyAll) return true;
    if (!myAlias) return false;
    return relatedPersonIds.has(alert.personAliasId);
  });

  const memberList = await prisma.groupMembership.findMany({
    where: { groupId, deletedAt: null, user: { deletedAt: null } },
    select: { userId: true, user: { select: { displayName: true, email: true } } },
  });

  const alertPersonIds = Array.from(new Set(visibleAlerts.map((a) => a.personAliasId)));
  const relationshipEvents = alertPersonIds.length
    ? await prisma.relationshipEvent.findMany({
        where: {
          groupId,
          deletedAt: null,
          OR: [
            { personAId: { in: alertPersonIds } },
            { personBId: { in: alertPersonIds } },
          ],
        },
        include: {
          personA: {
            select: {
              id: true,
              alias: true,
              userId: true,
              user: { select: { displayName: true, email: true } },
            },
          },
          personB: {
            select: {
              id: true,
              alias: true,
              userId: true,
              user: { select: { displayName: true, email: true } },
            },
          },
        },
      })
    : [];

  const relationshipsByPerson = new Map<string, Set<string>>();
  const personDetails = new Map<string, { alias: string; name?: string }>();

  for (const rel of relationshipEvents) {
    const pairs: Array<[typeof rel.personA, typeof rel.personB]> = [
      [rel.personA, rel.personB],
      [rel.personB, rel.personA],
    ];

    for (const [source, target] of pairs) {
      if (!alertPersonIds.includes(source.id)) continue;
      if (!target.userId) continue;
      const existing = relationshipsByPerson.get(source.id) ?? new Set<string>();
      existing.add(target.id);
      relationshipsByPerson.set(source.id, existing);
      personDetails.set(target.id, {
        alias: target.alias,
        name: target.user?.displayName || target.user?.email || undefined,
      });
    }
  }

  const alertsWithRecipients = visibleAlerts.map((alert) => {
    const canViewRecipients = alert.createdById === user.id;

    if (!canViewRecipients) {
      return { ...alert, recipients: [], recipientsHidden: true };
    }

    if (alert.notifyAll) {
      const recipients = memberList
        .filter((member) => member.userId !== alert.createdById)
        .map((member) => ({
          id: member.userId,
          label: member.user.displayName || member.user.email,
        }));
      return { ...alert, recipients, recipientsHidden: false };
    }

    const recipientIds = Array.from(relationshipsByPerson.get(alert.personAliasId) ?? []);
    const recipients = recipientIds.map((id) => {
      const details = personDetails.get(id);
      return {
        id,
        label: details?.name ? `${details.alias} (${details.name})` : details?.alias || id,
      };
    });

    return { ...alert, recipients, recipientsHidden: false };
  });

  return NextResponse.json({ alerts: alertsWithRecipients });
}
