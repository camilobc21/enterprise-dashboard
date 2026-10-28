import type { TrpcContext } from "../_core/context";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  activateAIProviderConfig: vi.fn(),
  createAIMessage: vi.fn(),
  createAIConversation: vi.fn(),
  deleteAIProviderConfig: vi.fn(),
  getAIProviderConfigByKey: vi.fn(),
  getAIConversationById: vi.fn(),
  getConversationMessages: vi.fn(),
  getUserAIConversations: vi.fn(),
  listAIProviderConfigs: vi.fn(),
  updateAIConversation: vi.fn(),
  upsertAIProviderConfig: vi.fn(),
}));

vi.mock("../db", () => dbMocks);
vi.mock("../ai/configuredProvider", () => ({
  getConfiguredProviderStatus: vi.fn().mockResolvedValue({ configured: true, providerName: "groq", baseUrl: "https://api.groq.com/openai/v1", model: "llama" }),
  invokeConfiguredAIChat: vi.fn(),
  normalizeProviderBaseUrl: vi.fn((url: string) => url),
}));
vi.mock("../ai/providerSecrets", () => ({ encryptProviderKey: vi.fn((key: string) => `encrypted:${key}`) }));

import { aiRouter, generateWiFiContext } from "./ai";

function makeUser(role: "admin" | "user") {
  return { id: 7, openId: "local:test", name: "Test", email: "test@example.com", passwordHash: "hash", loginMethod: "email_password", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
}

function createContext(role: "admin" | "user"): TrpcContext {
  return { user: makeUser(role), req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("AI provider management", () => {
  beforeEach(() => vi.clearAllMocks());

  it("prevents reading another user's conversation and messages", async () => {
    dbMocks.getAIConversationById.mockResolvedValue({ id: 5, userId: 99 });
    const caller = aiRouter.createCaller(createContext("user"));
    await expect(caller.getConversation({ id: 5 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller.getMessages({ conversationId: 5 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(dbMocks.getConversationMessages).not.toHaveBeenCalled();
  });

  it("allows reading the caller's own conversation", async () => {
    const conversation = { id: 5, userId: 7 };
    dbMocks.getAIConversationById.mockResolvedValue(conversation);
    dbMocks.getConversationMessages.mockResolvedValue([]);
    const caller = aiRouter.createCaller(createContext("user"));
    await expect(caller.getConversation({ id: 5 })).resolves.toEqual(conversation);
    await expect(caller.getMessages({ conversationId: 5 })).resolves.toEqual([]);
  });
  it("restricts the saved-provider list to administrators", async () => {
    const caller = aiRouter.createCaller(createContext("user"));
    await expect(caller.listProviderConfigs()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lists saved provider metadata without exposing encrypted keys", async () => {
    const providers = [{ id: 2, configKey: "groq", providerName: "groq", baseUrl: "https://api.groq.com/openai/v1", model: "llama", isActive: true, updatedAt: new Date() }];
    dbMocks.listAIProviderConfigs.mockResolvedValue(providers);
    const caller = aiRouter.createCaller(createContext("admin"));
    await expect(caller.listProviderConfigs()).resolves.toEqual(providers);
  });

  it("requires a key only when adding a new provider", async () => {
    dbMocks.getAIProviderConfigByKey.mockResolvedValue(null);
    const caller = aiRouter.createCaller(createContext("admin"));
    await expect(caller.saveProviderConfig({ configKey: "groq", providerName: "groq", baseUrl: "https://api.groq.com/openai/v1", model: "llama" })).rejects.toThrow("Pega una clave API");
    expect(dbMocks.upsertAIProviderConfig).not.toHaveBeenCalled();
  });

  it("activates and deletes saved providers as an administrator", async () => {
    dbMocks.activateAIProviderConfig.mockResolvedValue({ id: 2 });
    dbMocks.deleteAIProviderConfig.mockResolvedValue(true);
    const caller = aiRouter.createCaller(createContext("admin"));
    await expect(caller.activateProviderConfig({ id: 2 })).resolves.toMatchObject({ configured: true });
    await expect(caller.deleteProviderConfig({ id: 2 })).resolves.toEqual({ deleted: true });
  });
});


describe("WiFi AI context", () => {
  it("accepts ESP32 field names and converts fractional confidence to percent", () => {
    const context = generateWiFiContext({ redes: [{ ssid: "Lab", channel: 6, rssi: -60 }], prediccion: { confianza: 0.89 } });
    expect(context).toContain("Canal: 6");
    expect(context).toContain("Confianza: 89%");
    expect(context).toContain("no las presentes como mediciones reales");
  });
  it("handles unavailable arrays without breaking the conversation", () => {
    expect(() => generateWiFiContext({ redes: {}, canales: null, historico: "invalid" })).not.toThrow();
  });
});
