import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function isAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "owner";
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

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const members = await prisma.groupMembership.findMany({
    where: { groupId, deletedAt: null, user: { deletedAt: null } },
    select: {
      userId: true,
      role: true,
      createdAt: true,
      user: { select: { id: true, displayName: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ members });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { groupId } = await params;
  const body = await request.json();
  const { userId, role } = body as { userId?: string; role?: string };

  if (!userId || (role !== "admin" && role !== "member")) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const requesterMembership = await prisma.groupMembership.findUnique({
    where: {
      userId_groupId: { userId: user.id, groupId },
      deletedAt: null,
    },
  });

  if (!requesterMembership || !isAdminRole(requesterMembership.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const targetMembership = await prisma.groupMembership.findUnique({
    where: {
      userId_groupId: { userId, groupId },
      deletedAt: null,
    },
  });

  if (!targetMembership) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (targetMembership.role === "owner") {
    return NextResponse.json({ error: "Cannot change owner role" }, { status: 409 });
  }

  if (targetMembership.role === "admin" && role === "member") {
    const otherAdmins = await prisma.groupMembership.count({
      where: {
        groupId,
        deletedAt: null,
        role: { in: ["admin", "owner"] },
        userId: { not: userId },
      },
    });

    if (otherAdmins === 0) {
      return NextResponse.json({ error: "Cannot remove the last admin" }, { status: 409 });
    }
  }

  const updated = await prisma.groupMembership.update({
    where: { id: targetMembership.id },
    data: { role },
  });

  return NextResponse.json({ membership: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { groupId } = await params;
  const body = await request.json();
  const { userId } = body as { userId?: string };

  if (!userId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const requesterMembership = await prisma.groupMembership.findUnique({
    where: {
      userId_groupId: { userId: user.id, groupId },
      deletedAt: null,
    },
  });

  if (!requesterMembership || !isAdminRole(requesterMembership.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const targetMembership = await prisma.groupMembership.findUnique({
    where: {
      userId_groupId: { userId, groupId },
      deletedAt: null,
    },
  });

  if (!targetMembership) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (targetMembership.role === "owner") {
    return NextResponse.json({ error: "Cannot remove the owner" }, { status: 409 });
  }

  if (targetMembership.role === "admin") {
    const otherAdmins = await prisma.groupMembership.count({
      where: {
        groupId,
        deletedAt: null,
        role: { in: ["admin", "owner"] },
        userId: { not: userId },
      },
    });

    if (otherAdmins === 0) {
      return NextResponse.json({ error: "Cannot remove the last admin" }, { status: 409 });
    }
  }

  await prisma.groupMembership.update({
    where: { id: targetMembership.id },
    data: { deletedAt: new Date() },
  });

  await prisma.personAlias.updateMany({
    where: { groupId, userId },
    data: { userId: null },
  });

  return NextResponse.json({ success: true });
}
