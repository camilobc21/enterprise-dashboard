import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("auditoría de contenido productivo", () => {
  it("no expone demostraciones, estadísticas fijas ni páginas de showcase en las rutas públicas", () => {
    const home = readFileSync(resolve(process.cwd(), "client/src/pages/Home.tsx"), "utf8");
    const app = readFileSync(resolve(process.cwd(), "client/src/App.tsx"), "utf8");
    expect(home).not.toContain("Ver Demo");
    expect(home).not.toContain(">100%<");
    expect(home).not.toContain(">7+<");
    expect(home).not.toContain(">∞<");
    expect(app).not.toContain("ComponentShowcase");
    expect(existsSync(resolve(process.cwd(), "client/src/pages/ComponentShowcase.tsx"))).toBe(false);
  });
});
