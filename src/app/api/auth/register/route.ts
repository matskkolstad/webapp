import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { createAuditLog } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const isHttps =
    forwardedProto === "https" || request.nextUrl.protocol === "https:";
  const secureCookie = process.env.NODE_ENV === "production" ? isHttps : false;

  const { success } = rateLimit(`register:${ip}`, 5, 60000);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password, displayName, ageConfirmed, locale } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && !existing.deletedAt) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    if (existing && existing.deletedAt) {
      const restoredUser = await prisma.user.update({
        where: { id: existing.id },
        data: {
          passwordHash: await hashPassword(password),
          displayName,
          ageConfirmed,
          locale,
          deletedAt: null,
        },
      });

      await prisma.session.deleteMany({ where: { userId: restoredUser.id } });

      const jwt = await createSession(
        restoredUser.id,
        ip,
        request.headers.get("user-agent") || undefined
      );

      await createAuditLog({
        userId: restoredUser.id,
        action: "register",
        resource: "user",
        resourceId: restoredUser.id,
        ipAddress: ip,
      });

      const response = NextResponse.json(
        {
          user: {
            id: restoredUser.id,
            email: restoredUser.email,
            displayName: restoredUser.displayName,
            locale: restoredUser.locale,
          },
        },
        { status: 201 }
      );

      response.cookies.set("session", jwt, {
        httpOnly: true,
        secure: secureCookie,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
        path: "/",
      });

      return response;
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        ageConfirmed,
        locale,
      },
    });

    // Record consent
    await prisma.consentRecord.create({
      data: {
        userId: user.id,
        consentType: "terms",
        granted: true,
        version: "1.0",
        ipAddress: ip,
      },
    });

    const jwt = await createSession(
      user.id,
      ip,
      request.headers.get("user-agent") || undefined
    );

    await createAuditLog({
      userId: user.id,
      action: "register",
      resource: "user",
      resourceId: user.id,
      ipAddress: ip,
    });

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          locale: user.locale,
        },
      },
      { status: 201 }
    );

    response.cookies.set("session", jwt, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
