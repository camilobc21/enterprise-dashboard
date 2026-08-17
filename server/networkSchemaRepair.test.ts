import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("local network inventory schema repair", () => {
  it("creates the missing network_devices table without destructive statements", () => {
    const scriptPath = path.resolve(import.meta.dirname, "..", "scripts", "repair-local-network-schema.mjs");
    const content = fs.readFileSync(scriptPath, "utf8");

    expect(content).toContain("CREATE TABLE \\`network_devices\\`");
    expect(content).toContain("network_devices_owner_mac_unique");
    expect(content).toContain("router_arp");
    expect(content).not.toContain("DROP TABLE");
  });
});
