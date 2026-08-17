import { describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getNetworkDevices: vi.fn(),
  updateNetworkDeviceTrust: vi.fn(),
  upsertDetectedNetworkDevices: vi.fn(),
}));

const arpMocks = vi.hoisted(() => ({
  collectLocalArpDevices: vi.fn(),
}));

vi.mock("../db", () => dbMocks);
vi.mock("../network/arpDiscovery", () => arpMocks);

import { networkDevicesRouter } from "./networkDevices";

function makeUser(overrides: Partial<NonNullable<TrpcContext["user"]>> = {}) {
  return {
    id: 1,
    openId: "local:test-user",
    name: "Test User",
    email: "user@example.com",
    passwordHash: "stored-hash",
    loginMethod: "email_password",
    role: "user" as const,
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

describe("shared network device inventory", () => {
  it("allows an authenticated standard user to view the shared project inventory", async () => {
    const sharedDevices = [{ id: 7, ownerId: 1, macAddress: "AA:BB:CC:DD:EE:FF", status: "online", isTrusted: false }];
    dbMocks.getNetworkDevices.mockResolvedValue(sharedDevices);

    const caller = networkDevicesRouter.createCaller(createContext());

    await expect(caller.list()).resolves.toEqual(sharedDevices);
    expect(dbMocks.getNetworkDevices).toHaveBeenCalledWith();
  });

  it("keeps the local network refresh restricted to administrators", async () => {
    const caller = networkDevicesRouter.createCaller(createContext());

    await expect(caller.refreshLocalArp()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(arpMocks.collectLocalArpDevices).not.toHaveBeenCalled();
  });

  it("allows an administrator to refresh shared observations", async () => {
    const devices = [{ ipAddress: "192.168.1.1", macAddress: "AA:BB:CC:DD:EE:FF" }];
    arpMocks.collectLocalArpDevices.mockResolvedValue(devices);
    dbMocks.upsertDetectedNetworkDevices.mockResolvedValue(1);

    const caller = networkDevicesRouter.createCaller(createContext(makeUser({ role: "admin" })));

    await expect(caller.refreshLocalArp()).resolves.toMatchObject({ detected: 1 });
    expect(dbMocks.upsertDetectedNetworkDevices).toHaveBeenCalledWith(1, devices);
  });
});
