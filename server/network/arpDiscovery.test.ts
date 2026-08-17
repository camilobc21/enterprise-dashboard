import { describe, expect, it } from "vitest";
import { derivePrivate24Targets, parseArpOutput } from "./arpDiscovery";

describe("ARP device discovery", () => {
  it("parses private Windows ARP entries and normalizes their MAC addresses", () => {
    const devices = parseArpOutput(`
Interface: 192.168.1.10 --- 0x9
  Internet Address      Physical Address      Type
  192.168.1.1           aa-bb-cc-dd-ee-ff     dynamic
  8.8.8.8               00-00-00-00-00-00     static
`);

    expect(devices).toEqual([{ ipAddress: "192.168.1.1", macAddress: "AA:BB:CC:DD:EE:FF" }]);
  });

  it("parses Unix ARP entries and ignores incomplete addresses", () => {
    const devices = parseArpOutput(`
? (10.0.0.5) at 01:23:45:67:89:ab [ether] on en0
? (10.0.0.6) at (incomplete) on en0
`);

    expect(devices).toEqual([{ ipAddress: "10.0.0.5", macAddress: "01:23:45:67:89:AB" }]);
  });

  it("derives a bounded private /24 target list without probing the host computer itself", () => {
    const targets = derivePrivate24Targets("192.168.1.8");

    expect(targets).toHaveLength(253);
    expect(targets).toContain("192.168.1.1");
    expect(targets).toContain("192.168.1.254");
    expect(targets).not.toContain("192.168.1.8");
  });

  it("refuses non-private ranges for active discovery", () => {
    expect(() => derivePrivate24Targets("8.8.8.8")).toThrow("IPv4 privada");
  });
});
