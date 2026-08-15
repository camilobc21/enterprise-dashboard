import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Windows development launcher", () => {
  it("uses local cmd executables instead of the PowerShell pnpm shim", () => {
    const launcherPath = path.resolve(import.meta.dirname, "..", "run-dev.cmd");
    const content = fs.readFileSync(launcherPath, "utf8");

    expect(content).toContain("cross-env.cmd");
    expect(content).toContain("tsx.cmd");
    expect(content).not.toContain("pnpm.ps1");
  });
});
