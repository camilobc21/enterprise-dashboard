import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("local password security", () => {
  it("creates a salted hash that verifies only the original password", () => {
    const password = "ClaveSegura123";
    const hash = hashPassword(password);

    expect(hash).not.toBe(password);
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword(password, hash)).toBe(true);
    expect(verifyPassword("otra-clave", hash)).toBe(false);
  });

  it("uses a different salt for identical passwords", () => {
    const firstHash = hashPassword("ClaveSegura123");
    const secondHash = hashPassword("ClaveSegura123");

    expect(firstHash).not.toBe(secondHash);
    expect(verifyPassword("ClaveSegura123", firstHash)).toBe(true);
    expect(verifyPassword("ClaveSegura123", secondHash)).toBe(true);
  });

  it("rejects a malformed stored hash", () => {
    expect(verifyPassword("ClaveSegura123", "invalid-hash")).toBe(false);
  });
});
