import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("local authentication schema repair", () => {
  it("includes a non-destructive repair command for the local users table", () => {
    const scriptPath = path.resolve(import.meta.dirname, "..", "scripts", "repair-local-auth-schema.mjs");
    const content = fs.readFileSync(scriptPath, "utf8");

    expect(content).toContain('await addColumn("name"');
    expect(content).toContain('await addColumn("passwordHash"');
    expect(content).toContain('await addColumn("loginMethod"');
    expect(content).toContain("CREATE UNIQUE INDEX");
    expect(content).toContain("No rows were deleted or merged");
    expect(content).not.toContain("DROP TABLE");
  });
});
