import { describe, expect, it } from "vitest";
import { parseArpOutput } from "./arpDiscovery";

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
});
