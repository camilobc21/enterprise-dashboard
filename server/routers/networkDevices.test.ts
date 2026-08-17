import { describe, expect, it } from "vitest";
import { networkDeviceInputSchema } from "./networkDevices";

describe("connected device input", () => {
  it("normalizes MAC addresses while preserving authorized inventory fields", () => {
    const result = networkDeviceInputSchema.parse({
      displayName: "Sensor autorizado",
      ipAddress: "192.168.1.42",
      macAddress: "aa-bb-cc-dd-ee-ff",
      deviceType: "iot",
      status: "online",
      isTrusted: true,
    });

    expect(result.macAddress).toBe("AA:BB:CC:DD:EE:FF");
    expect(result.source).toBe("manual");
  });

  it("rejects an invalid MAC address", () => {
    expect(() => networkDeviceInputSchema.parse({ displayName: "Equipo", macAddress: "invalid" })).toThrow();
  });
});
