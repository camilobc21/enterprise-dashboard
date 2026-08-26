import { describe, expect, it, vi } from "vitest";

const flaskMocks = vi.hoisted(() => ({
  getDashboardData: vi.fn(),
  getLastScan: vi.fn(),
  getChannels: vi.fn(),
  getAlerts: vi.fn(),
  getPredictions: vi.fn(),
  getHistory: vi.fn(),
  getFutureAnomalies: vi.fn(),
  getDetectedNetworks: vi.fn(),
  hasData: vi.fn(),
  healthCheck: vi.fn(),
}));

vi.mock("../_core/flaskClient", () => flaskMocks);

import { wifiRouter } from "./wifi";

function makeContext(role: "admin" | "user" = "user"): TrpcContext {
  return {
    user: { id: 1, openId: "local:contract", name: "Contract", email: "contract@example.com", passwordHash: "hash", loginMethod: "email_password", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "http", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("contrato tRPC WiFi", () => {
  const rawDashboard = {
    sin_datos: false,
    ultimo_escaneo: { id: 8, total_redes: 1, saturacion_general: null, ocupacion_espectral: null, perdida_paquetes: null, tendencia_ia: null, canal_optimo: null },
    redes: [{ ssid: "Lab", bssid: "AA:BB:CC:DD:EE:FF", canal: 6, rssi: -60, encriptacion: "WPA2" }],
    canales: [{ canal: 6, cantidad_redes: 1, saturacion: null, ocupacion_espectral: null, interferencia_adyacente: null, perdida_paquetes: null, riesgo_anomalia: null, anomalia: null }],
    alertas: [], prediccion: null, historico: [], anomalias_futuras: [],
  };

  it("mantiene nulas las métricas no medidas y minimiza BSSID para un usuario estándar", async () => {
    flaskMocks.getDashboardData.mockResolvedValue(rawDashboard);
    const result = await wifiRouter.createCaller(makeContext()).getDashboard();

    expect(result.ultimo_escaneo).toMatchObject({ saturacion_general: null, ocupacion_espectral: null, perdida_paquetes: null, tendencia_ia: null, canal_optimo: null });
    expect(result.canales[0]).toMatchObject({ saturacion: null, ocupacion_espectral: null, interferencia_adyacente: null, perdida_paquetes: null, riesgo_anomalia: null, anomalia: null });
    expect(result.redes[0]).not.toHaveProperty("bssid");
  });

  it("permite el BSSID únicamente en la respuesta administrativa", async () => {
    flaskMocks.getDashboardData.mockResolvedValue(rawDashboard);
    const result = await wifiRouter.createCaller(makeContext("admin")).getDashboard();
    expect(result.redes[0]).toMatchObject({ bssid: "AA:BB:CC:DD:EE:FF" });
  });
});
