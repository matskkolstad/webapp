import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { joinGroupSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = joinGroupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const invite = await prisma.inviteCode.findUnique({
      where: { code: parsed.data.code, deletedAt: null },
    });

    if (!invite || invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired invite code" },
        { status: 400 }
      );
    }

    if (invite.maxUses > 0 && invite.uses >= invite.maxUses) {
      return NextResponse.json(
        { error: "Invite code has reached maximum uses" },
        { status: 400 }
      );
    }

    const existingMembership = await prisma.groupMembership.findUnique({
      where: {
        userId_groupId: { userId: user.id, groupId: invite.groupId },
      },
    });

    if (existingMembership && !existingMembership.deletedAt) {
      return NextResponse.json(
        { error: "Already a member of this group" },
        { status: 409 }
      );
    }

    const preferredAlias = user.displayName?.trim() || user.email;

    await prisma.$transaction(async (tx) => {
      if (existingMembership) {
        await tx.groupMembership.update({
          where: { id: existingMembership.id },
          data: { deletedAt: null, role: "member" },
        });
      } else {
        await tx.groupMembership.create({
          data: {
            userId: user.id,
            groupId: invite.groupId,
            role: "member",
          },
        });
      }

      await tx.inviteCode.update({
        where: { id: invite.id },
        data: { uses: { increment: 1 } },
      });

      const existingPerson = await tx.personAlias.findFirst({
        where: { groupId: invite.groupId, userId: user.id },
        select: { id: true, deletedAt: true },
      });

      if (existingPerson) {
        await tx.personAlias.update({
          where: { id: existingPerson.id },
          data: { deletedAt: null, alias: preferredAlias },
        });
      } else {
        await tx.personAlias.create({
          data: {
            groupId: invite.groupId,
            userId: user.id,
            alias: preferredAlias,
          },
        });
      }
    });

    await createAuditLog({
      userId: user.id,
      action: "join_group",
      resource: "group",
      resourceId: invite.groupId,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    });

    return NextResponse.json({ groupId: invite.groupId }, { status: 200 });
  } catch (error) {
    console.error("Join group error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
