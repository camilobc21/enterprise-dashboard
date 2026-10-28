import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getDashboardData,
  getLastScan,
  getChannels,
  getAlerts,
  getPredictions,
  getHistory,
  getFutureAnomalies,
  getDetectedNetworks,
  hasData,
  healthCheck as checkFlaskHealth,
} from "../_core/flaskClient";

export const wifiRouter = router({
  // Obtener último escaneo WiFi
  getLastScan: protectedProcedure.query(async ({ ctx }) => {
    try {
      const scan = await getLastScan();
      return scan || null;
    } catch (error) {
      console.error("[WiFi] Error fetching last scan:", error);
      return null;
    }
  }),

  // Obtener histórico de escaneos (últimas 24h, 7d, 30d)
  getHistory: protectedProcedure
    .input(
      z.object({
        timeRange: z.enum(["24h", "7d", "30d"]).default("24h"),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const history = await getHistory();
        return history || [];
      } catch (error) {
        console.error("[WiFi] Error fetching history:", error);
        return [];
      }
    }),

  // Obtener análisis de canales del último escaneo
  getChannels: protectedProcedure.query(async ({ ctx }) => {
    try {
      const channels = await getChannels();
      return channels || [];
    } catch (error) {
      console.error("[WiFi] Error fetching channels:", error);
      return [];
    }
  }),

  // Obtener alertas recientes
  getAlerts: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const alerts = await getAlerts();
        return alerts?.slice(0, input.limit) || [];
      } catch (error) {
        console.error("[WiFi] Error fetching alerts:", error);
        return [];
      }
    }),

  // Obtener predicción de IA
  getPrediction: protectedProcedure.query(async ({ ctx }) => {
    try {
      const prediction = await getPredictions();
      return prediction || null;
    } catch (error) {
      console.error("[WiFi] Error fetching prediction:", error);
      return null;
    }
  }),

  // Obtener dashboard completo
  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    try {
      const data = await getDashboardData();

      if (!data || data.sin_datos) {
        return {
          ok: true,
          sin_datos: true,
          ultimo_escaneo: null,
          canales: [],
          redes: [],
          alertas: [],
          prediccion: null,
          historico: [],
          anomalias_futuras: [],
        };
      }

      return {
        ok: true,
        sin_datos: false,
        ultimo_escaneo: data.ultimo_escaneo,
        canales: data.canales || [],
        redes: data.redes || [],
        alertas: data.alertas || [],
        prediccion: data.prediccion,
        historico: data.historico || [],
        anomalias_futuras: data.anomalias_futuras || [],
      };
    } catch (error) {
      console.error("[WiFi] Error fetching dashboard:", error);
      return {
        ok: false,
        sin_datos: true,
        ultimo_escaneo: null,
        canales: [],
        redes: [],
        alertas: [],
        prediccion: null,
        historico: [],
        anomalias_futuras: [],
      };
    }
  }),

  // Obtener tendencias (últimos 7 días)
  getTrends: protectedProcedure.query(async ({ ctx }) => {
    try {
      const history = await getHistory();

      if (!history || history.length === 0) {
        return [];
      }

      // Agrupar por fecha y calcular promedios
      const trends = history.map((item: any) => ({
        timestamp: item.timestamp,
        saturacion_general: item.saturacion_general,
        ocupacion_espectral: item.ocupacion_espectral,
        perdida_paquetes: item.perdida_paquetes,
        total_redes: item.total_redes,
        tendencia_ia: item.tendencia_ia,
      }));

      return trends;
    } catch (error) {
      console.error("[WiFi] Error fetching trends:", error);
      return [];
    }
  }),

  // Obtener redes detectadas
  getNetworks: protectedProcedure.query(async ({ ctx }) => {
    try {
      const networks = await getDetectedNetworks();
      return networks || [];
    } catch (error) {
      console.error("[WiFi] Error fetching networks:", error);
      return [];
    }
  }),

  // Health check
  healthCheck: protectedProcedure.query(async ({ ctx }) => {
    try {
      const health = await checkFlaskHealth();
      if (!health.ok || !health.connected) {
        return { ok: false, connected: false, hasData: false };
      }
      const hasAnyData = await hasData();
      return {
        ok: true,
        connected: true,
        hasData: hasAnyData,
      };
    } catch (error) {
      console.error("[WiFi] Health check failed:", error);
      return {
        ok: false,
        connected: false,
        hasData: false,
      };
    }
  }),
});
