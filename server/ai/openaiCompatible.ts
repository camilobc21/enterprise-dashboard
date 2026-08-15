export type AIChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OpenAICompatibleConfig = {
  baseUrl: string;
  model: string;
  apiKey: string;
};

function getChatEndpoint(baseUrl: string) {
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "https:") {
    throw new Error("La URL del proveedor de IA debe usar HTTPS");
  }

  return `${parsed.toString().replace(/\/$/, "")}/chat/completions`;
}

export async function requestOpenAICompatibleChat(
  config: OpenAICompatibleConfig,
  messages: AIChatMessage[]
) {
  const response = await fetch(getChatEndpoint(config.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 500);
    throw new Error(`El proveedor de IA respondió ${response.status}: ${detail || response.statusText}`);
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("El proveedor de IA no devolvió contenido de chat");
  }

  return content;
}
