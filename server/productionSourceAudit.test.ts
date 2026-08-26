import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

function sourceFiles(directory: string, extension: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path, extension);
    return entry.isFile() && entry.name.endsWith(extension) ? [path] : [];
  });
}

describe("auditoría integral de fuentes productivas", () => {
  it("rechaza lenguaje demo o mock en cada pantalla y router expuesto", () => {
    const project = process.cwd();
    const pages = sourceFiles(resolve(project, "client/src/pages"), ".tsx");
    const routers = sourceFiles(resolve(project, "server/routers"), ".ts");
    const forbidden = /\b(mockdata|mockpiedata|simulated|simulad[oa]?|\bdummy\b|\bfake\b|ver demo)\b/i;

    for (const file of [...pages, ...routers]) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(forbidden);
    }
  });

  it("exige que la API Flask declare nulas las métricas WiFi no observadas", () => {
    const flask = readFileSync(resolve(process.cwd(), "app.py"), "utf8");
    expect(flask).toContain('"saturacion_general": None');
    expect(flask).toContain('"ocupacion_espectral": None');
    expect(flask).toContain('"interferencia_adyacente": None');
    expect(flask).toContain('"perdida_paquetes": None');
    expect(flask).toContain('"prediction": None');
  });
});
