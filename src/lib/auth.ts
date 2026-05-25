import * as argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { v4 as uuidv4 } from "uuid";

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET environment variable is required in production");
}

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me"
);
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  return argon2.verify(hash, password);
}

export async function createSession(
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: { userId, token, expiresAt, ipAddress, userAgent },
  });

  const jwt = await new SignJWT({ sub: userId, sid: token })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAt)
    .setIssuedAt()
    .sign(JWT_SECRET);

  return jwt;
}

export async function verifySession(
  token: string
): Promise<{ userId: string; sessionId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const session = await prisma.session.findUnique({
      where: { token: payload.sid as string },
    });
    if (!session || session.expiresAt < new Date()) return null;
    return { userId: payload.sub as string, sessionId: session.id };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  const result = await verifySession(token);
  if (!result) return null;

  const user = await prisma.user.findUnique({
    where: { id: result.userId, deletedAt: null },
    select: {
      id: true,
      email: true,
      displayName: true,
      locale: true,
      ageConfirmed: true,
      createdAt: true,
    },
  });

  return user;
}

export async function destroySession(token: string): Promise<void> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    await prisma.session.delete({
      where: { token: payload.sid as string },
    });
  } catch {
    // Session already invalid
  }
}
