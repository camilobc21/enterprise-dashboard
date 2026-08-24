import { getAIProviderConfig } from "../db";
import { getAIProviderProfile, resolveAIProviderModel } from "@shared/aiProviders";
import { type AIChatMessage } from "./openaiCompatible";
import { requestConfiguredProviderChat } from "./multiProvider";
import { decryptProviderKey } from "./providerSecrets";

export function normalizeProviderBaseUrl(baseUrl: string, providerName = "custom") {
  const parsed = new URL(baseUrl.trim());
  const profile = getAIProviderProfile(providerName);
  const localHostname = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
  if (parsed.protocol !== "https:" && !(profile.allowsHttpLocal && localHostname && parsed.protocol === "http:")) {
    throw new Error("La URL del proveedor debe usar HTTPS; HTTP solo se permite para modelos locales en localhost.");
  }

  if (profile.id === "groq" && parsed.hostname === "api.groq.com" && (parsed.pathname === "" || parsed.pathname === "/")) {
    parsed.pathname = "/openai/v1";
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
    model: resolveAIProviderModel(config.providerName, config.model),
    updatedAt: config.updatedAt,
  };
}

export async function invokeConfiguredAIChat(messages: AIChatMessage[]) {
  const config = await getAIProviderConfig();
  if (!config) {
    throw new Error("La IA no está configurada. Un administrador debe añadir la clave API en Gestión de roles.");
  }

  return requestConfiguredProviderChat(
    {
      providerName: config.providerName,
      baseUrl: config.baseUrl,
      model: resolveAIProviderModel(config.providerName, config.model),
      apiKey: decryptProviderKey(config.encryptedApiKey),
    },
    messages
  );
}
