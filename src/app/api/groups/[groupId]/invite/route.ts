import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateInviteCode } from "@/lib/utils";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { groupId } = await params;

  const membership = await prisma.groupMembership.findUnique({
    where: {
      userId_groupId: { userId: user.id, groupId },
      deletedAt: null,
    },
  });

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const code = generateInviteCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await prisma.inviteCode.create({
    data: {
      groupId,
      code,
      expiresAt,
      createdBy: user.id,
    },
  });

  return NextResponse.json({ invite }, { status: 201 });
}

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
    where: {
      userId_groupId: { userId: user.id, groupId },
      deletedAt: null,
    },
  });

  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const invites = await prisma.inviteCode.findMany({
    where: { groupId, deletedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ invites });
}
