import { describe, expect, it } from "vitest";
import { generateWiFiContext } from "./ai";

describe("contrato de contexto IA WiFi", () => {
  it("preserva N/D y prohíbe inferir mediciones cuando los datos no existen", () => {
    const context = generateWiFiContext({
      sin_datos: false,
      ultimo_escaneo: { total_redes: 1, timestamp: "2026-08-26T12:00:00Z", saturacion_general: null, ocupacion_espectral: null, perdida_paquetes: null },
      redes: [{ ssid: "Lab", bssid: "AA:BB:CC:DD:EE:FF", canal: 6, rssi: -60, encriptacion: "WPA2" }],
      canales: [{ canal: 6, cantidad_redes: 1 }], historico: [],
    });

    expect(context).toContain("N/D (el escaneo pasivo ESP32 no los mide)");
    expect(context).toContain("No inventes mediciones");
    expect(context).not.toContain("AA:BB:CC:DD:EE:FF");
  });
});
