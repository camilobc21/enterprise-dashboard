import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("presentación de observaciones WiFi reales", () => {
  it("no rellena las métricas no medidas con ceros, predicciones o puntuaciones", () => {
    const analysis = readFileSync(resolve(process.cwd(), "client/src/pages/WiFiAnalysis.tsx"), "utf8");
    const trends = readFileSync(resolve(process.cwd(), "client/src/pages/WiFiTrends.tsx"), "utf8");
    const aiRouter = readFileSync(resolve(process.cwd(), "server/routers/ai.ts"), "utf8");
    const exporter = readFileSync(resolve(process.cwd(), "server/routers/export.ts"), "utf8");
    expect(analysis).not.toContain("Predicción de IA");
    expect(trends).not.toContain("riesgo_anomalia || 0");
    expect(trends).not.toContain("canal_optimo_predicho || 6");
    expect(aiRouter).not.toContain("saturacion_general || 0");
    expect(aiRouter).toContain("No inventes mediciones");
    expect(exporter).not.toContain("Saturación General");
    expect(exporter).toContain("Redes observadas");
  });
});
