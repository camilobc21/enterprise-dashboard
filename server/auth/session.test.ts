import type { Request } from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { COOKIE_NAME } from "../../shared/const";
import { createLocalSession, getLocalSessionUserId } from "./session";

const previousSecret = process.env.JWT_SECRET;

beforeAll(() => {
  process.env.JWT_SECRET = "test-local-session-secret-with-sufficient-length";
});

afterAll(() => {
  if (previousSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = previousSecret;
  }
});

function requestWithToken(token: string): Request {
  return { headers: { cookie: `${COOKIE_NAME}=${token}` } } as Request;
}

describe("local JWT sessions", () => {
  it("signs and verifies a session without an OAuth provider", async () => {
    const token = await createLocalSession({ userId: 42, email: "user@example.com" });

    await expect(getLocalSessionUserId(requestWithToken(token))).resolves.toBe(42);
  });

  it("rejects a tampered token", async () => {
    const token = await createLocalSession({ userId: 42, email: "user@example.com" });
    const finalCharacter = token.endsWith("a") ? "b" : "a";
    const tamperedToken = `${token.slice(0, -1)}${finalCharacter}`;

    await expect(getLocalSessionUserId(requestWithToken(tamperedToken))).resolves.toBeNull();
  });
});
