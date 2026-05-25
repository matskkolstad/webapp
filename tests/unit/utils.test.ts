import { describe, it, expect } from "vitest";
import { cn, generateInviteCode, formatDate } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    const result = cn("foo", "bar");
    expect(result).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    const result = cn("foo", false && "bar", "baz");
    expect(result).toBe("foo baz");
  });
});

describe("generateInviteCode", () => {
  it("generates an 8-character code", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(8);
  });

  it("only contains valid characters", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateInviteCode()));
    expect(codes.size).toBeGreaterThan(90);
  });
});

describe("formatDate", () => {
  it("formats date in Norwegian locale", () => {
    const date = new Date("2024-06-15");
    const result = formatDate(date, "nb-NO");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("formats date in English locale", () => {
    const date = new Date("2024-06-15");
    const result = formatDate(date, "en-US");
    expect(result).toBeTruthy();
  });
});
