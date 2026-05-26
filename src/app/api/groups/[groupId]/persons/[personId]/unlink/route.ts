import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(
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

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const person = await prisma.personAlias.findFirst({
    where: { id: personId, groupId, deletedAt: null },
  });

  if (!person) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  if (person.userId !== user.id) {
    return NextResponse.json({ error: "Not linked to your account" }, { status: 403 });
  }

  const updated = await prisma.personAlias.update({
    where: { id: person.id },
    data: { userId: null },
  });

  return NextResponse.json({ person: updated });
}
