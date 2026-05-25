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

    await prisma.$transaction([
      existingMembership
        ? prisma.groupMembership.update({
            where: { id: existingMembership.id },
            data: { deletedAt: null, role: "member" },
          })
        : prisma.groupMembership.create({
            data: {
              userId: user.id,
              groupId: invite.groupId,
              role: "member",
            },
          }),
      prisma.inviteCode.update({
        where: { id: invite.id },
        data: { uses: { increment: 1 } },
      }),
    ]);

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
