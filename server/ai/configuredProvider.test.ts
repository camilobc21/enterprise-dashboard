import { describe, expect, it } from "vitest";
import { normalizeProviderBaseUrl } from "./configuredProvider";

describe("provider URL normalization", () => {
  it("completes the Groq OpenAI-compatible path when only the host is entered", () => {
    expect(normalizeProviderBaseUrl("https://api.groq.com", "groq")).toBe("https://api.groq.com/openai/v1");
  });

  it("permits plain HTTP only for the explicit local Ollama profile", () => {
    expect(normalizeProviderBaseUrl("http://127.0.0.1:11434/v1", "ollama")).toBe("http://127.0.0.1:11434/v1");
    expect(() => normalizeProviderBaseUrl("http://api.example.com/v1", "custom")).toThrow("HTTPS");
  });
});
