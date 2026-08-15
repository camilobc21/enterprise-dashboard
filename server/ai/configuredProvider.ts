import { getAIProviderConfig } from "../db";
import { requestOpenAICompatibleChat, type AIChatMessage } from "./openaiCompatible";
import { decryptProviderKey } from "./providerSecrets";

export function normalizeProviderBaseUrl(baseUrl: string) {
  const parsed = new URL(baseUrl.trim());
  if (parsed.protocol !== "https:") {
    throw new Error("La URL del proveedor debe usar HTTPS");
  }

  return parsed.toString().replace(/\/$/, "");
}

export async function getConfiguredProviderStatus() {
  const config = await getAIProviderConfig();
  if (!config) return { configured: false as const };

  return {
    configured: true as const,
    providerName: config.providerName,
    baseUrl: config.baseUrl,
    model: config.model,
    updatedAt: config.updatedAt,
  };
}

export async function invokeConfiguredAIChat(messages: AIChatMessage[]) {
  const config = await getAIProviderConfig();
  if (!config) {
    throw new Error("La IA no está configurada. Un administrador debe añadir la clave API en Gestión de roles.");
  }

  return requestOpenAICompatibleChat(
    {
      baseUrl: config.baseUrl,
      model: config.model,
      apiKey: decryptProviderKey(config.encryptedApiKey),
    },
    messages
  );
}
