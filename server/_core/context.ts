import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// Mock user for development
const MOCK_USER: User = {
  id: 1,
  openId: "dev-user-001",
  name: "Camilo Barrios",
  email: "camilo@example.com",
  loginMethod: "development",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
} as User;

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // In development mode, provide mock user
    if (process.env.NODE_ENV === "development") {
      console.log(`[Auth] Using mock user: ${MOCK_USER.name}`);
      user = MOCK_USER;
    } else {
      // Authentication is optional for public procedures in production
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
