import type { TrpcContext } from "../_core/context";
import { describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  countRegisteredAdmins: vi.fn(),
  deleteUser: vi.fn(),
  getAllUsers: vi.fn(),
  getUserById: vi.fn(),
  updateUserRole: vi.fn(),
}));

vi.mock("../db", () => dbMocks);

import { usersRouter } from "./users";

function makeUser(overrides: Partial<NonNullable<TrpcContext["user"]>> = {}) {
  return {
    id: 1,
    openId: "local:test-user",
    name: "Admin Test",
    email: "admin@example.com",
    passwordHash: "stored-hash",
    loginMethod: "email_password",
    role: "admin" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function createContext(user = makeUser()): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("users role management", () => {
  it("rejects role management requests from non-admin users", async () => {
    const caller = usersRouter.createCaller(createContext(makeUser({ role: "user" })));

    await expect(caller.getAll()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("prevents an administrator from removing their own admin role", async () => {
    dbMocks.getUserById.mockResolvedValue(makeUser());
    const caller = usersRouter.createCaller(createContext());

    await expect(caller.updateRole({ userId: 1, role: "user" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(dbMocks.countRegisteredAdmins).not.toHaveBeenCalled();
    expect(dbMocks.updateUserRole).not.toHaveBeenCalled();
  });

  it("prevents demoting the final registered administrator", async () => {
    dbMocks.getUserById.mockResolvedValue(makeUser({ id: 2 }));
    dbMocks.countRegisteredAdmins.mockResolvedValue(1);
    const caller = usersRouter.createCaller(createContext());

    await expect(caller.updateRole({ userId: 2, role: "user" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(dbMocks.updateUserRole).not.toHaveBeenCalled();
  });

  it("allows an administrator to promote a registered user", async () => {
    const target = makeUser({ id: 2, role: "user" });
    dbMocks.getUserById.mockResolvedValue(target);
    dbMocks.updateUserRole.mockResolvedValue({ ...target, role: "admin" });
    const caller = usersRouter.createCaller(createContext());

    await expect(caller.updateRole({ userId: 2, role: "admin" })).resolves.toMatchObject({
      id: 2,
      role: "admin",
    });
    expect(dbMocks.updateUserRole).toHaveBeenCalledWith(2, "admin");
  });
});
