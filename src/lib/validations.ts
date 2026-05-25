import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  displayName: z.string().min(1).max(50).optional(),
  ageConfirmed: z.literal(true, {
    errorMap: () => ({ message: "You must confirm you are 18+" }),
  }),
  locale: z.enum(["nb", "en"]).default("nb"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required").max(100),
  description: z.string().max(500).optional(),
  networkVisibility: z.enum(["full", "limited"]).default("full"),
});

export const joinGroupSchema = z.object({
  code: z.string().min(1, "Invite code is required"),
});

export const createPersonSchema = z.object({
  alias: z.string().min(1, "Alias is required").max(50),
  contactToken: z.string().max(200).optional(),
});

export const createRelationshipSchema = z.object({
  personAId: z.string().uuid(),
  personBId: z.string().uuid(),
  eventDate: z.string().datetime().optional().nullable(),
  protectionStatus: z.enum(["protected", "unprotected", "unknown"]).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const createAlertSchema = z.object({
  personAliasId: z.string().uuid(),
  isAnonymous: z.boolean().default(true),
  message: z.string().max(1000).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type JoinGroupInput = z.infer<typeof joinGroupSchema>;
export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type CreateRelationshipInput = z.infer<typeof createRelationshipSchema>;
export type CreateAlertInput = z.infer<typeof createAlertSchema>;
