import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("estado real del servicio Flask", () => {
  it("no reintenta respuestas 4xx y delega el estado de conexión en el health check de Flask", () => {
    const client = readFileSync(resolve(process.cwd(), "server/_core/flaskClient.ts"), "utf8");
    const router = readFileSync(resolve(process.cwd(), "server/routers/wifi.ts"), "utf8");
    expect(client).toContain("response.status >= 500 && attempt < RETRY_ATTEMPTS");
    expect(router).toContain("healthCheck as checkFlaskHealth");
    expect(router).toContain("const flaskStatus = await checkFlaskHealth()");
    expect(router).toContain("connected: flaskStatus.connected");
  });
});
