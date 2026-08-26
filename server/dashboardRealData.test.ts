import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("dashboard real-data presentation", () => {
  it("uses WiFi, document and conversation queries instead of fixed demonstration charts", () => {
    const content = readFileSync(resolve(process.cwd(), "client/src/pages/Dashboard.tsx"), "utf8");
    expect(content).toContain("trpc.wifi.getDashboard.useQuery()");
    expect(content).toContain("trpc.wifi.getTrends.useQuery()");
    expect(content).toContain("trpc.documents.getDocuments.useQuery");
    expect(content).toContain("trpc.ai.getConversations.useQuery()");
    expect(content).not.toContain("mockData");
    expect(content).not.toContain("mockPieData");
  });
});
