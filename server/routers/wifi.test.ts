import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

vi.mock("../_core/flaskClient", () => ({
  getDashboardData: vi.fn(), getLastScan: vi.fn(), getChannels: vi.fn(),
  getAlerts: vi.fn(), getPredictions: vi.fn(), getHistory: vi.fn(),
  getFutureAnomalies: vi.fn(), getDetectedNetworks: vi.fn(),
  hasData: vi.fn(), healthCheck: vi.fn(),
}));
import { healthCheck, hasData } from "../_core/flaskClient";
import { wifiRouter } from "./wifi";

const caller = () => wifiRouter.createCaller({ user: { id: 7 } } as TrpcContext);

describe("WiFi connection status", () => {
  beforeEach(() => vi.clearAllMocks());
  it("reports a failed Flask connection without claiming success", async () => {
    vi.mocked(healthCheck).mockResolvedValue({ ok: false, connected: false });
    await expect(caller().healthCheck()).resolves.toEqual({ ok: false, connected: false, hasData: false });
    expect(hasData).not.toHaveBeenCalled();
  });
  it("distinguishes a connected empty database from an offline service", async () => {
    vi.mocked(healthCheck).mockResolvedValue({ ok: true, connected: true });
    vi.mocked(hasData).mockResolvedValue(false);
    await expect(caller().healthCheck()).resolves.toEqual({ ok: true, connected: true, hasData: false });
  });
});
