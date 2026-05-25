import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createPersonSchema } from "@/lib/validations";

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

  const persons = await prisma.personAlias.findMany({
    where: { groupId, deletedAt: null },
    orderBy: { alias: "asc" },
    select: {
      id: true,
      alias: true,
      contactToken: true,
      userId: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ persons });
}

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

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createPersonSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const person = await prisma.personAlias.create({
      data: {
        groupId,
        userId: user.id,
        alias: parsed.data.alias,
        contactToken: parsed.data.contactToken,
      },
    });

    return NextResponse.json({ person }, { status: 201 });
  } catch (error) {
    console.error("Create person error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
