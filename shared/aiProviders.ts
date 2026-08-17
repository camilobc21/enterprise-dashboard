export type AIProviderProtocol = "openai-compatible" | "anthropic" | "google";

export type AIProviderProfile = {
  id: string;
  label: string;
  protocol: AIProviderProtocol;
  defaultBaseUrl: string;
  defaultModel: string;
  description: string;
  allowsHttpLocal?: boolean;
};

export const AI_PROVIDER_PROFILES: AIProviderProfile[] = [
  { id: "openai", label: "OpenAI", protocol: "openai-compatible", defaultBaseUrl: "https://api.openai.com/v1", defaultModel: "gpt-4o-mini", description: "API de Chat Completions de OpenAI." },
  { id: "anthropic", label: "Anthropic", protocol: "anthropic", defaultBaseUrl: "https://api.anthropic.com/v1", defaultModel: "claude-3-5-haiku-latest", description: "API nativa Messages de Claude." },
  { id: "google", label: "Google Gemini", protocol: "google", defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta", defaultModel: "gemini-2.0-flash", description: "API nativa Google Generative Language." },
  { id: "groq", label: "Groq", protocol: "openai-compatible", defaultBaseUrl: "https://api.groq.com/openai/v1", defaultModel: "llama-3.3-70b-versatile", description: "Modelos de baja latencia compatibles con OpenAI." },
  { id: "deepseek", label: "DeepSeek", protocol: "openai-compatible", defaultBaseUrl: "https://api.deepseek.com/v1", defaultModel: "deepseek-chat", description: "API compatible con OpenAI." },
  { id: "openrouter", label: "OpenRouter", protocol: "openai-compatible", defaultBaseUrl: "https://openrouter.ai/api/v1", defaultModel: "openai/gpt-4o-mini", description: "Acceso a múltiples modelos mediante una API compatible." },
  { id: "ollama", label: "Ollama local", protocol: "openai-compatible", defaultBaseUrl: "http://127.0.0.1:11434/v1", defaultModel: "llama3.2", description: "Modelos locales vía la compatibilidad OpenAI de Ollama.", allowsHttpLocal: true },
  { id: "custom", label: "Personalizado compatible", protocol: "openai-compatible", defaultBaseUrl: "", defaultModel: "", description: "Cualquier servidor compatible con OpenAI, como LM Studio, vLLM o un gateway propio.", allowsHttpLocal: true },
];

export function getAIProviderProfile(providerName: string | null | undefined): AIProviderProfile {
  const normalized = (providerName ?? "").trim().toLowerCase();
  const legacyAliases: Record<string, string> = {
    "google gemini": "google",
    gemini: "google",
    claude: "anthropic",
    "openai compatible": "custom",
  };
  const profileId = legacyAliases[normalized] ?? normalized;
  return AI_PROVIDER_PROFILES.find((profile) => profile.id === profileId) ?? AI_PROVIDER_PROFILES.find((profile) => profile.id === "custom")!;
}
