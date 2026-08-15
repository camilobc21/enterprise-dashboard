import type { Request } from "express";
import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./cookies";

function requestFor(protocol: "http" | "https", forwardedProto?: string): Request {
  return {
    protocol,
    headers: forwardedProto ? { "x-forwarded-proto": forwardedProto } : {},
  } as Request;
}

describe("session cookie options", () => {
  it("uses a browser-compatible Lax cookie for local HTTP", () => {
    expect(getSessionCookieOptions(requestFor("http"))).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });
  });

  it("uses SameSite=None only for secure HTTPS requests", () => {
    expect(getSessionCookieOptions(requestFor("https"))).toMatchObject({
      sameSite: "none",
      secure: true,
    });
    expect(getSessionCookieOptions(requestFor("http", "https"))).toMatchObject({
      sameSite: "none",
      secure: true,
    });
  });
});
