import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveStaticDistPath } from "./vite";

describe("resolveStaticDistPath", () => {
  it("resolves the public frontend assets next to the bundled server entry", () => {
    expect(resolveStaticDistPath("/srv/enterprise-dashboard/dist")).toBe(
      path.resolve("/srv/enterprise-dashboard/dist/public")
    );
  });
});
