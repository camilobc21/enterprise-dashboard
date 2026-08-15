import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveStaticDistPath } from "./vite";

describe("resolveStaticDistPath", () => {
  it("resolves the frontend assets in the bundled server directory", () => {
    expect(resolveStaticDistPath("/srv/enterprise-dashboard/dist")).toBe(
      path.resolve("/srv/enterprise-dashboard/dist")
    );
  });
});
