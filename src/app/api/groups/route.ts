import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createGroupSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const memberships = await prisma.groupMembership.findMany({
    where: { userId: user.id, deletedAt: null },
    include: {
      group: {
        include: {
          _count: {
            select: {
              memberships: { where: { deletedAt: null } },
              relationshipEvents: { where: { deletedAt: null } },
            },
          },
        },
      },
    },
  });

  const groups = memberships.map((m) => ({
    id: m.group.id,
    name: m.group.name,
    description: m.group.description,
    role: m.role,
    memberCount: m.group._count.memberships,
    relationshipCount: m.group._count.relationshipEvents,
    createdAt: m.group.createdAt,
  }));

  return NextResponse.json({ groups });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = createGroupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const preferredAlias = user.displayName?.trim() || user.email;

    const group = await prisma.$transaction(async (tx) => {
      const createdGroup = await tx.group.create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          networkVisibility: parsed.data.networkVisibility,
          memberships: {
            create: {
              userId: user.id,
              role: "admin",
            },
          },
        },
      });

      await tx.personAlias.create({
        data: {
          groupId: createdGroup.id,
          userId: user.id,
          alias: preferredAlias,
        },
      });

      return createdGroup;
    });

    await createAuditLog({
      userId: user.id,
      action: "create_group",
      resource: "group",
      resourceId: group.id,
      ipAddress: request.headers.get("x-forwarded-for") || "unknown",
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error("Create group error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
