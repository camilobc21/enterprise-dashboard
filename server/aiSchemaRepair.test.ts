import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("local AI provider schema repair", () => {
  it("creates the provider configuration table without destructive statements", () => {
    const scriptPath = path.resolve(import.meta.dirname, "..", "scripts", "repair-local-ai-schema.mjs");
    const content = fs.readFileSync(scriptPath, "utf8");

    expect(content).toContain("CREATE TABLE \\`ai_provider_configs\\`");
    expect(content).toContain("ai_provider_configs_configKey_unique");
    expect(content).toContain("isActive");
    expect(content).toContain("ai_provider_configs_isActive_idx");
    expect(content).toContain("encryptedApiKey");
    expect(content).not.toContain("DROP TABLE");
  });
});
