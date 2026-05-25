import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [fullUser, memberships, personAliases, notifications, consentRecords, auditLogs] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          displayName: true,
          locale: true,
          ageConfirmed: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.groupMembership.findMany({
        where: { userId: user.id },
        include: { group: { select: { name: true } } },
      }),
      prisma.personAlias.findMany({
        where: { userId: user.id },
        include: {
          relationshipsAsPersonA: {
            select: {
              id: true,
              eventDate: true,
              protectionStatus: true,
              createdAt: true,
              personB: { select: { alias: true } },
            },
          },
          relationshipsAsPersonB: {
            select: {
              id: true,
              eventDate: true,
              protectionStatus: true,
              createdAt: true,
              personA: { select: { alias: true } },
            },
          },
        },
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
      }),
      prisma.consentRecord.findMany({
        where: { userId: user.id },
      }),
      prisma.auditLog.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: fullUser,
    memberships,
    personAliases,
    notifications,
    consentRecords,
    auditLogs,
  };

  await createAuditLog({
    userId: user.id,
    action: "export_data",
    resource: "user",
    resourceId: user.id,
    ipAddress: request.headers.get("x-forwarded-for") || "unknown",
  });

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="liggnett-data-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
