import { getAIProviderProfile } from "@shared/aiProviders";
import { requestOpenAICompatibleChat, type AIChatMessage, type OpenAICompatibleConfig } from "./openaiCompatible";

type ProviderConfig = OpenAICompatibleConfig & { providerName: string };

async function readError(response: Response) {
  return (await response.text()).slice(0, 500) || response.statusText;
}

export async function requestAnthropicChat(config: ProviderConfig, messages: AIChatMessage[]) {
  const baseUrl = config.baseUrl.replace(/\/$/, "");
  const system = messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n");
  const response = await fetch(`${baseUrl}/messages`, {
    method: "POST",
    headers: { "x-api-key": config.apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: config.model, max_tokens: 1_024, ...(system ? { system } : {}), messages: messages.filter((message) => message.role !== "system") }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`El proveedor de IA respondió ${response.status}: ${await readError(response)}`);
  const payload = await response.json() as { content?: Array<{ type?: string; text?: string }> };
  const content = payload.content?.filter((part) => part.type === "text").map((part) => part.text ?? "").join("").trim();
  if (!content) throw new Error("Anthropic no devolvió contenido de chat");
  return content;
}

export async function requestGoogleChat(config: ProviderConfig, messages: AIChatMessage[]) {
  const baseUrl = config.baseUrl.replace(/\/$/, "");
  const model = config.model.replace(/^models\//, "");
  const endpoint = new URL(`${baseUrl}/models/${encodeURIComponent(model)}:generateContent`);
  endpoint.searchParams.set("key", config.apiKey);
  const system = messages.filter((message) => message.role === "system").map((message) => message.content).join("\n\n");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: messages.filter((message) => message.role !== "system").map((message) => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })),
      generationConfig: { temperature: 0.3 },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!response.ok) throw new Error(`El proveedor de IA respondió ${response.status}: ${await readError(response)}`);
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!content) throw new Error("Google Gemini no devolvió contenido de chat");
  return content;
}

export async function requestConfiguredProviderChat(config: ProviderConfig, messages: AIChatMessage[]) {
  const profile = getAIProviderProfile(config.providerName);
  if (profile.protocol === "anthropic") return requestAnthropicChat(config, messages);
  if (profile.protocol === "google") return requestGoogleChat(config, messages);
  return requestOpenAICompatibleChat(config, messages);
}
