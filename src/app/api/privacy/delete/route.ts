import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, destroySession } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    let removeLinkedPersons = false;
    let removeAllGroups = false;
    let groupIds: string[] = [];

    try {
      const body = await request.json();
      removeLinkedPersons = !!body?.removeLinkedPersons;
      removeAllGroups = !!body?.removeAllGroups;
      groupIds = Array.isArray(body?.groupIds) ? body.groupIds : [];
    } catch {
      removeLinkedPersons = false;
      removeAllGroups = false;
      groupIds = [];
    }

    const linkedGroups = await prisma.personAlias.findMany({
      where: { userId: user.id, deletedAt: null },
      select: { groupId: true },
    });
    const linkedGroupIds = linkedGroups.map((g) => g.groupId);
    const deleteGroupIds = removeLinkedPersons
      ? removeAllGroups
        ? linkedGroupIds
        : groupIds
      : [];
    const unlinkGroupIds = linkedGroupIds.filter(
      (id) => !deleteGroupIds.includes(id)
    );

    const adminMemberships = await prisma.groupMembership.findMany({
      where: { userId: user.id, role: { in: ["admin", "owner"] }, deletedAt: null },
      select: { groupId: true },
    });

    await prisma.$transaction(async (tx) => {
      // Soft delete: mark user as deleted
      await tx.user.update({
        where: { id: user.id },
        data: { deletedAt: new Date() },
      });

      // Soft delete all memberships
      await tx.groupMembership.updateMany({
        where: { userId: user.id },
        data: { deletedAt: new Date() },
      });

      if (deleteGroupIds.length > 0) {
        await tx.personAlias.updateMany({
          where: { userId: user.id, groupId: { in: deleteGroupIds } },
          data: { deletedAt: new Date(), userId: null },
        });
      }

      if (unlinkGroupIds.length > 0) {
        await tx.personAlias.updateMany({
          where: { userId: user.id, groupId: { in: unlinkGroupIds } },
          data: { userId: null },
        });
      }

      // Delete all sessions
      await tx.session.deleteMany({
        where: { userId: user.id },
      });

      for (const membership of adminMemberships) {
        const otherAdmins = await tx.groupMembership.count({
          where: {
            groupId: membership.groupId,
            deletedAt: null,
            role: { in: ["admin", "owner"] },
            userId: { not: user.id },
            user: { deletedAt: null },
          },
        });

        if (otherAdmins === 0) {
          await tx.group.update({
            where: { id: membership.groupId },
            data: { deletedAt: new Date() },
          });
          await tx.groupMembership.updateMany({
            where: { groupId: membership.groupId },
            data: { deletedAt: new Date() },
          });
          await tx.personAlias.updateMany({
            where: { groupId: membership.groupId },
            data: { deletedAt: new Date(), userId: null },
          });
          await tx.relationshipEvent.updateMany({
            where: { groupId: membership.groupId },
            data: { deletedAt: new Date() },
          });
          await tx.relationshipVerification.deleteMany({
            where: { relationshipEvent: { groupId: membership.groupId } },
          });
          await tx.exposureAlert.updateMany({
            where: { groupId: membership.groupId },
            data: { deletedAt: new Date() },
          });
          await tx.inviteCode.updateMany({
            where: { groupId: membership.groupId },
            data: { deletedAt: new Date() },
          });
        }
      }
    });

    await createAuditLog({
      userId: user.id,
      action: "delete_account",
      resource: "user",
      resourceId: user.id,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    });

    const token = request.cookies.get("session")?.value;
    if (token) {
      await destroySession(token);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete("session");
    return response;
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
