import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function isAdminRole(role: string | null | undefined) {
  return role === "admin" || role === "owner";
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ groupId: string; personId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { groupId, personId } = await params;

  const membership = await prisma.groupMembership.findUnique({
    where: {
      userId_groupId: { userId: user.id, groupId },
      deletedAt: null,
    },
  });

  if (!membership || !isAdminRole(membership.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const person = await prisma.personAlias.findFirst({
    where: { id: personId, groupId, deletedAt: null },
  });

  if (!person) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.personAlias.update({
      where: { id: person.id },
      data: { deletedAt: new Date(), userId: null },
    });

    const relationships = await tx.relationshipEvent.findMany({
      where: {
        groupId,
        deletedAt: null,
        OR: [{ personAId: person.id }, { personBId: person.id }],
      },
      select: { id: true },
    });

    if (relationships.length > 0) {
      const ids = relationships.map((rel) => rel.id);
      await tx.relationshipVerification.deleteMany({
        where: { relationshipEventId: { in: ids } },
      });
      await tx.relationshipEvent.updateMany({
        where: { id: { in: ids } },
        data: { deletedAt: new Date() },
      });
    }

    await tx.exposureAlert.updateMany({
      where: { personAliasId: person.id },
      data: { deletedAt: new Date() },
    });
  });

  return NextResponse.json({ success: true });
}
