import { prisma } from "./db";

export type AuditAction =
  | "login"
  | "logout"
  | "register"
  | "create_relationship"
  | "delete_relationship"
  | "verify_relationship"
  | "create_alert"
  | "create_group"
  | "join_group"
  | "leave_group"
  | "export_data"
  | "delete_account"
  | "consent_granted"
  | "consent_revoked";

export async function createAuditLog(params: {
  userId?: string;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  // Never log sensitive data
  const sanitizedMetadata = params.metadata
    ? Object.fromEntries(
        Object.entries(params.metadata).filter(
          ([key]) => !["password", "token", "secret", "hash"].includes(key.toLowerCase())
        )
      )
    : undefined;

  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      metadata: sanitizedMetadata as Record<string, string | number | boolean | null> | undefined,
      ipAddress: params.ipAddress,
    },
  });
}
