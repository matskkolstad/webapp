import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const groups = await prisma.group.findMany({
    where: {
      deletedAt: null,
      personAliases: {
        some: {
          userId: user.id,
          deletedAt: null,
        },
      },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ groups });
}
