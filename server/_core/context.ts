import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getLocalSessionUserId } from "../auth/session";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  const userId = await getLocalSessionUserId(opts.req);
  if (userId) {
    user = await db.getUserById(userId);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
