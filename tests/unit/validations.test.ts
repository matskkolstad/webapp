import { describe, it, expect } from "vitest";
import {
  registerSchema,
  loginSchema,
  createGroupSchema,
  joinGroupSchema,
  createPersonSchema,
  createRelationshipSchema,
  createAlertSchema,
} from "@/lib/validations";

describe("registerSchema", () => {
  it("accepts valid registration data", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "Password1",
      ageConfirmed: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({
      email: "not-email",
      password: "Password1",
      ageConfirmed: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "Pass1",
      ageConfirmed: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without uppercase", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "password1",
      ageConfirmed: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects password without number", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "Passwordd",
      ageConfirmed: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects without age confirmation", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "Password1",
      ageConfirmed: false,
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional display name", () => {
    const result = registerSchema.safeParse({
      email: "test@example.com",
      password: "Password1",
      ageConfirmed: true,
      displayName: "Test User",
    });
    expect(result.success).toBe(true);
  });
});

describe("loginSchema", () => {
  it("accepts valid login data", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "password",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("createGroupSchema", () => {
  it("accepts valid group data", () => {
    const result = createGroupSchema.safeParse({
      name: "My Group",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createGroupSchema.safeParse({
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional description and visibility", () => {
    const result = createGroupSchema.safeParse({
      name: "My Group",
      description: "A test group",
      networkVisibility: "limited",
    });
    expect(result.success).toBe(true);
  });
});

describe("joinGroupSchema", () => {
  it("accepts valid code", () => {
    const result = joinGroupSchema.safeParse({ code: "ABCD1234" });
    expect(result.success).toBe(true);
  });

  it("rejects empty code", () => {
    const result = joinGroupSchema.safeParse({ code: "" });
    expect(result.success).toBe(false);
  });
});

describe("createPersonSchema", () => {
  it("accepts valid person data", () => {
    const result = createPersonSchema.safeParse({ alias: "TestPerson" });
    expect(result.success).toBe(true);
  });

  it("rejects empty alias", () => {
    const result = createPersonSchema.safeParse({ alias: "" });
    expect(result.success).toBe(false);
  });

  it("accepts optional contact token", () => {
    const result = createPersonSchema.safeParse({
      alias: "TestPerson",
      contactToken: "email@test.com",
    });
    expect(result.success).toBe(true);
  });
});

describe("createRelationshipSchema", () => {
  it("accepts valid relationship with minimal data", () => {
    const result = createRelationshipSchema.safeParse({
      personAId: "550e8400-e29b-41d4-a716-446655440000",
      personBId: "550e8400-e29b-41d4-a716-446655440001",
    });
    expect(result.success).toBe(true);
  });

  it("accepts relationship with all optional fields", () => {
    const result = createRelationshipSchema.safeParse({
      personAId: "550e8400-e29b-41d4-a716-446655440000",
      personBId: "550e8400-e29b-41d4-a716-446655440001",
      eventDate: "2024-01-15T00:00:00.000Z",
      protectionStatus: "protected",
      notes: "Some notes",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID", () => {
    const result = createRelationshipSchema.safeParse({
      personAId: "not-a-uuid",
      personBId: "550e8400-e29b-41d4-a716-446655440001",
    });
    expect(result.success).toBe(false);
  });
});

describe("createAlertSchema", () => {
  it("accepts valid alert data", () => {
    const result = createAlertSchema.safeParse({
      personAliasId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("defaults isAnonymous to true", () => {
    const result = createAlertSchema.safeParse({
      personAliasId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isAnonymous).toBe(true);
    }
  });
});
