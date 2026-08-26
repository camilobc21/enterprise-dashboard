import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("WiFi observation schema repair", () => {
  it("creates a scan-linked network observation table and preserves unavailable metrics as nullable", () => {
    const content = readFileSync(resolve(process.cwd(), "scripts/repair-local-wifi-schema.mjs"), "utf8");
    expect(content).toContain("CREATE TABLE \\`wifi_networks\\`");
    expect(content).toContain("wifi_networks_scanId_wifi_scans_id_fk");
    expect(content).toContain("MODIFY COLUMN `ocupacionEspectral` decimal(5,2) NULL");
    expect(content).toContain("MODIFY COLUMN `perdidaPaquetes` decimal(5,2) NULL");
    expect(content).toContain("MODIFY COLUMN `saturacionGeneral` decimal(5,2) NULL");
    expect(content).toContain("UPDATE `wifi_channels` SET `saturacion` = NULL");
  });
});
