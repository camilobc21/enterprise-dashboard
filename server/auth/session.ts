import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { jwtVerify, SignJWT } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";

const SESSION_ISSUER = "enterprise-dashboard";
const SESSION_AUDIENCE = "enterprise-dashboard-web";

function getSessionSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET must be configured to use local authentication");
  }

  return new TextEncoder().encode(secret);
}

export async function createLocalSession(input: {
  userId: number;
  email: string | null;
}) {
  const expiresAt = Math.floor((Date.now() + ONE_YEAR_MS) / 1000);

  return new SignJWT({ email: input.email ?? "" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(String(input.userId))
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(getSessionSecret());
}

export async function getLocalSessionUserId(req: Request) {
  const token = parseCookieHeader(req.headers.cookie ?? "")[COOKIE_NAME];
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });
    const userId = Number(payload.sub);

    return Number.isSafeInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}
