import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

// Mock users for development
const MOCK_USERS: Record<string, User> = {
  "1": {
    id: 1,
    openId: "dev-user-001",
    name: "Camilo Barrios",
    email: "camilo@example.com",
    loginMethod: "development",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as User,
  "2": {
    id: 2,
    openId: "dev-user-002",
    name: "Juan García",
    email: "juan@example.com",
    loginMethod: "development",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as User,
  "3": {
    id: 3,
    openId: "dev-user-003",
    name: "María López",
    email: "maria@example.com",
    loginMethod: "development",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as User,
  "4": {
    id: 4,
    openId: "dev-user-004",
    name: "Carlos Rodríguez",
    email: "carlos@example.com",
    loginMethod: "development",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  } as User,
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // In development mode, provide mock users
    if (process.env.NODE_ENV === "development") {
      // Try to get selected user from cookie
      const cookies = opts.req.headers.cookie || "";
      const mockUserMatch = cookies.match(/mockUser=([^;]+)/);
      const selectedUserId = mockUserMatch ? decodeURIComponent(mockUserMatch[1]) : "1";

      // Parse the user data if it's JSON
      try {
        const userData = JSON.parse(selectedUserId);
        const mockUser = MOCK_USERS[userData.id] || MOCK_USERS["1"];
        console.log(`[Auth] Using mock user: ${mockUser.name}`);
        user = mockUser;
      } catch {
        // If not JSON, treat as user ID
        const mockUser = MOCK_USERS[selectedUserId] || MOCK_USERS["1"];
        console.log(`[Auth] Using mock user: ${mockUser.name}`);
        user = mockUser;
      }
    } else {
      // Authentication is optional for public procedures in production.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
