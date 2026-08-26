import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("minimización de datos WiFi", () => {
  it("reserva BSSID para administradores y no lo envía al contexto IA", () => {
    const wifiRouter = readFileSync(resolve(process.cwd(), "server/routers/wifi.ts"), "utf8");
    const networksPage = readFileSync(resolve(process.cwd(), "client/src/pages/WiFiNetworks.tsx"), "utf8");
    const aiRouter = readFileSync(resolve(process.cwd(), "server/routers/ai.ts"), "utf8");
    expect(wifiRouter).toContain('role === "admin" ? networks');
    expect(networksPage).toContain("{isAdmin && <TableHead>BSSID</TableHead>}");
    expect(aiRouter).not.toContain("BSSID: ${display(r.bssid)}");
  });
});
