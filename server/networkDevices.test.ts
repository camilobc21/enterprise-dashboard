import { describe, expect, it } from "vitest";
import { normalizeDetectedNetworkDevices } from "./db";

describe("normalizeDetectedNetworkDevices", () => {
  it("normaliza el formato MAC y conserva el último IP observado por dispositivo", () => {
    expect(
      normalizeDetectedNetworkDevices([
        { ipAddress: " 192.168.1.20 ", macAddress: "aa-bb-cc-dd-ee-ff" },
        { ipAddress: "192.168.1.21", macAddress: "AA:BB:CC:DD:EE:FF" },
      ]),
    ).toEqual([
      { ipAddress: "192.168.1.21", macAddress: "AA:BB:CC:DD:EE:FF" },
    ]);
  });

  it("descarta registros ARP sin dirección IP o MAC", () => {
    expect(
      normalizeDetectedNetworkDevices([
        { ipAddress: "", macAddress: "AA:BB:CC:DD:EE:01" },
        { ipAddress: "192.168.1.22", macAddress: "" },
        { ipAddress: "192.168.1.23", macAddress: "AA:BB:CC:DD:EE:02" },
      ]),
    ).toEqual([
      { ipAddress: "192.168.1.23", macAddress: "AA:BB:CC:DD:EE:02" },
    ]);
  });
});
