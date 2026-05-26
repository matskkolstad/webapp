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

  if (person.userId && person.userId !== user.id) {
    return NextResponse.json({ error: "Person already linked" }, { status: 409 });
  }

  const preferredAlias = user.displayName?.trim() || user.email;
  const displayName = user.displayName?.trim();

  const existingLink = await prisma.personAlias.findFirst({
    where: {
      groupId,
      userId: user.id,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (existingLink && existingLink.id !== person.id) {
    const aliasNormalized = person.alias.trim().toLowerCase();
    const displayNameNormalized = displayName?.toLowerCase();
    const firstNameNormalized = displayNameNormalized?.split(" ")[0];
    const canMerge =
      !!displayNameNormalized &&
      (aliasNormalized === displayNameNormalized ||
        aliasNormalized === firstNameNormalized);

    if (!canMerge) {
      return NextResponse.json(
        { error: "You already linked a person in this group" },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (existingLink && existingLink.id !== person.id) {
      await tx.relationshipEvent.updateMany({
        where: { personAId: existingLink.id },
        data: { personAId: person.id },
      });
      await tx.relationshipEvent.updateMany({
        where: { personBId: existingLink.id },
        data: { personBId: person.id },
      });
      await tx.relationshipVerification.updateMany({
        where: { verifiedByPersonId: existingLink.id },
        data: { verifiedByPersonId: person.id },
      });
      await tx.exposureAlert.updateMany({
        where: { personAliasId: existingLink.id },
        data: { personAliasId: person.id },
      });
      await tx.personAlias.update({
        where: { id: existingLink.id },
        data: { deletedAt: new Date(), userId: null },
      });
    }

    const updatedPerson = await tx.personAlias.update({
      where: { id: person.id },
      data: { userId: user.id, alias: preferredAlias },
    });

    const selfRelations = await tx.relationshipEvent.findMany({
      where: {
        groupId,
        personAId: person.id,
        personBId: person.id,
      },
      select: { id: true },
    });

    if (selfRelations.length > 0) {
      const ids = selfRelations.map((rel) => rel.id);
      await tx.relationshipVerification.deleteMany({
        where: { relationshipEventId: { in: ids } },
      });
      await tx.relationshipEvent.deleteMany({
        where: { id: { in: ids } },
      });
    }

    return updatedPerson;
  });

  return NextResponse.json({ person: updated });
}
