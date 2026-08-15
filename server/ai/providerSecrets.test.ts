import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { normalizeProviderBaseUrl } from "./configuredProvider";
import { decryptProviderKey, encryptProviderKey } from "./providerSecrets";

const previousSecret = process.env.JWT_SECRET;

beforeAll(() => {
  process.env.JWT_SECRET = "test-provider-encryption-secret-with-sufficient-length";
});

afterAll(() => {
  if (previousSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = previousSecret;
});

describe("AI provider key protection", () => {
  it("encrypts an API key without retaining it in plaintext", () => {
    const apiKey = "sk-test-key-that-must-not-be-stored-plain-text";
    const encrypted = encryptProviderKey(apiKey);

    expect(encrypted).not.toContain(apiKey);
    expect(decryptProviderKey(encrypted)).toBe(apiKey);
  });

  it("rejects a modified encrypted API key", () => {
    const encrypted = encryptProviderKey("sk-test-key");
    const [iv, tag, ciphertext] = encrypted.split(".");
    const firstCharacter = ciphertext[0] === "a" ? "b" : "a";
    const altered = `${iv}.${tag}.${firstCharacter}${ciphertext.slice(1)}`;

    expect(() => decryptProviderKey(altered)).toThrow();
  });

  it("accepts HTTPS provider endpoints and removes the trailing slash", () => {
    expect(normalizeProviderBaseUrl("https://api.openai.com/v1/")).toBe("https://api.openai.com/v1");
    expect(() => normalizeProviderBaseUrl("http://api.openai.com/v1")).toThrow("HTTPS");
  });
});
