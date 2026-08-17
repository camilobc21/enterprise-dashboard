import { requestAnthropicChat, requestGoogleChat } from "./multiProvider";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllGlobals());

describe("native AI provider adapters", () => {
  it("uses Anthropic Messages with its required authentication headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [{ type: "text", text: "OK" }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestAnthropicChat({ providerName: "anthropic", baseUrl: "https://api.anthropic.com/v1", model: "claude-test", apiKey: "key" }, [{ role: "user", content: "Hola" }])).resolves.toBe("OK");
    expect(fetchMock).toHaveBeenCalledWith("https://api.anthropic.com/v1/messages", expect.objectContaining({ headers: expect.objectContaining({ "x-api-key": "key", "anthropic-version": "2023-06-01" }) }));
  });

  it("uses Google Generative Language with a model endpoint and API key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "OK" }] } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestGoogleChat({ providerName: "google", baseUrl: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-test", apiKey: "key" }, [{ role: "user", content: "Hola" }])).resolves.toBe("OK");
    expect(fetchMock).toHaveBeenCalledWith(expect.objectContaining({ href: expect.stringContaining("models/gemini-test:generateContent?key=key") }), expect.any(Object));
  });
});
