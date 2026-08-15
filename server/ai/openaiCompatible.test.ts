import { afterEach, describe, expect, it, vi } from "vitest";
import { requestOpenAICompatibleChat } from "./openaiCompatible";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OpenAI-compatible chat client", () => {
  it("sends the configured model and bearer key to the chat endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "respuesta de prueba" } }],
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestOpenAICompatibleChat({
      baseUrl: "https://api.example.com/v1",
      model: "example-model",
      apiKey: "test-api-key",
    }, [{ role: "user", content: "Hola" }])).resolves.toBe("respuesta de prueba");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer test-api-key" }),
      })
    );
  });
});
