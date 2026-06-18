import { z } from "zod";
import axios from "axios";
import { publicProcedure, router } from "../_core/trpc";

// URL de la API Flask (ajustar según tu configuración)
const FLASK_API_URL = process.env.FLASK_API_URL || "https://wolverine-punctual-immorally.ngrok-free.dev";

// Esquemas de validación
const WifiNetworkSchema = z.object({
  ssid: z.string(),
  rssi: z.number(),
  canal: z.number(),
  ancho_banda: z.number(),
  encriptacion: z.string(),
});

const CanalSchema = z.object({
  canal: z.number(),
  cantidad_redes: z.number(),
  saturacion: z.number(),
  ocupacion_espectral: z.number(),
  interferencia_adyacente: z.number(),
  perdida_paquetes: z.number(),
  riesgo_anomalia: z.number(),
  anomalia: z.number(),
});

const AlertaSchema = z.object({
  canal: z.number(),
  tipo: z.string(),
  severidad: z.string(),
  descripcion: z.string(),
  timestamp: z.string(),
});

const PrediccionSchema = z.object({
  canal_predicho: z.number(),
  confianza: z.number(),
  score_espectral: z.number(),
  detalle: z.string(),
});

const DashboardDataSchema = z.object({
  ok: z.boolean(),
  sin_datos: z.boolean().optional(),
  ultimo_escaneo: z.object({
    id: z.number(),
    dispositivo: z.string(),
    total_redes: z.number(),
    canal_optimo: z.number(),
    saturacion_general: z.number(),
    ocupacion_espectral: z.number(),
    perdida_paquetes: z.number(),
    tendencia_ia: z.number(),
    timestamp: z.string(),
  }).optional(),
  redes: z.array(WifiNetworkSchema).optional(),
  canales: z.array(CanalSchema).optional(),
  prediccion: PrediccionSchema.optional(),
  alertas: z.array(AlertaSchema).optional(),
  historico: z.array(z.any()).optional(),
  anomalias_futuras: z.array(z.any()).optional(),
});

export const wifiRouter = router({
  // Obtener datos del dashboard WiFi
  getDashboard: publicProcedure.query(async () => {
    try {
      const response = await axios.get(`${FLASK_API_URL}/api/dashboard`, { timeout: 5000 });
      const data = DashboardDataSchema.parse(response.data);
      return data;
    } catch (error) {
      console.warn("[WiFi] Error fetching dashboard:", error instanceof Error ? error.message : error);
      // Retornar datos vacíos en lugar de lanzar error
      return {
        ok: false,
        sin_datos: true,
        redes: [],
        canales: [],
        alertas: [],
        historico: [],
        anomalias_futuras: [],
      };
    }
  }),

  // Obtener solo redes detectadas
  getNetworks: publicProcedure.query(async () => {
    try {
      const response = await axios.get(`${FLASK_API_URL}/api/dashboard`);
      const data = DashboardDataSchema.parse(response.data);
      return data.redes || [];
    } catch (error) {
      console.error("[WiFi] Error fetching networks:", error);
      return [];
    }
  }),

  // Obtener análisis de canales
  getChannels: publicProcedure.query(async () => {
    try {
      const response = await axios.get(`${FLASK_API_URL}/api/dashboard`);
      const data = DashboardDataSchema.parse(response.data);
      return data.canales || [];
    } catch (error) {
      console.error("[WiFi] Error fetching channels:", error);
      return [];
    }
  }),

  // Obtener alertas
  getAlerts: publicProcedure.query(async () => {
    try {
      const response = await axios.get(`${FLASK_API_URL}/api/dashboard`);
      const data = DashboardDataSchema.parse(response.data);
      return data.alertas || [];
    } catch (error) {
      console.error("[WiFi] Error fetching alerts:", error);
      return [];
    }
  }),

  // Obtener predicción de canal óptimo
  getPrediction: publicProcedure.query(async () => {
    try {
      const response = await axios.get(`${FLASK_API_URL}/api/dashboard`);
      const data = DashboardDataSchema.parse(response.data);
      return data.prediccion;
    } catch (error) {
      console.error("[WiFi] Error fetching prediction:", error);
      return null;
    }
  }),

  // Obtener predicciones de anomalías futuras
  getAnomaliesFuture: publicProcedure.query(async () => {
    try {
      const response = await axios.get(`${FLASK_API_URL}/api/dashboard`);
      const data = DashboardDataSchema.parse(response.data);
      return data.anomalias_futuras || [];
    } catch (error) {
      console.error("[WiFi] Error fetching future anomalies:", error);
      return [];
    }
  }),

  // Obtener histórico de escaneos
  getHistory: publicProcedure.query(async () => {
    try {
      const response = await axios.get(`${FLASK_API_URL}/api/dashboard`);
      const data = DashboardDataSchema.parse(response.data);
      return data.historico || [];
    } catch (error) {
      console.error("[WiFi] Error fetching history:", error);
      return [];
    }
  }),

  // Obtener último escaneo
  getLastScan: publicProcedure.query(async () => {
    try {
      const response = await axios.get(`${FLASK_API_URL}/api/dashboard`);
      const data = DashboardDataSchema.parse(response.data);
      return data.ultimo_escaneo;
    } catch (error) {
      console.error("[WiFi] Error fetching last scan:", error);
      return null;
    }
  }),

  // Enviar escaneo desde ESP (si es necesario)
  sendScan: publicProcedure
    .input(
      z.object({
        redes: z.array(
          z.object({
            ssid: z.string(),
            rssi: z.number(),
            canal: z.number(),
            ancho_banda: z.number().optional(),
            encriptacion: z.string().optional(),
            perdida_paquetes: z.number().optional(),
          })
        ),
        dispositivo: z.string().optional(),
        perdida_paquetes: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const response = await axios.post(`${FLASK_API_URL}/api/esp_scan`, {
          redes: input.redes,
          dispositivo: input.dispositivo || "ESP8266",
          perdida_paquetes: input.perdida_paquetes || 0,
        });
        return response.data;
      } catch (error) {
        console.error("[WiFi] Error sending scan:", error);
        throw new Error("No se pudo enviar el escaneo a la API Flask");
      }
    }),

  // Verificar conexión con Flask
  healthCheck: publicProcedure.query(async () => {
    try {
      const response = await axios.get(`${FLASK_API_URL}/api/dashboard`, {
        timeout: 5000,
      });
      return { ok: true, connected: response.status === 200 };
    } catch (error) {
      console.error("[WiFi] Health check failed:", error);
      return { ok: false, connected: false };
    }
  }),
});
