import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { wifiScans, wifiChannels, wifiAlerts, wifiPredictions } from "../../drizzle/schema";
import { eq, desc, and, gte } from "drizzle-orm";

export const wifiRouter = router({
  // Obtener último escaneo WiFi
  getLastScan: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) return null;

      const lastScan = await db
        .select()
        .from(wifiScans)
        .where(eq(wifiScans.userId, ctx.user.id))
        .orderBy(desc(wifiScans.timestamp))
        .limit(1);

      return lastScan[0] || null;
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
        const db = await getDb();
        if (!db) return [];

        const now = new Date();
        let startDate = new Date();

        if (input.timeRange === "24h") {
          startDate.setHours(now.getHours() - 24);
        } else if (input.timeRange === "7d") {
          startDate.setDate(now.getDate() - 7);
        } else if (input.timeRange === "30d") {
          startDate.setDate(now.getDate() - 30);
        }

        const history = await db
          .select()
          .from(wifiScans)
          .where(
            and(
              eq(wifiScans.userId, ctx.user.id),
              gte(wifiScans.timestamp, startDate)
            )
          )
          .orderBy(desc(wifiScans.timestamp));

        return history;
      } catch (error) {
        console.error("[WiFi] Error fetching history:", error);
        return [];
      }
    }),

  // Obtener análisis de canales del último escaneo
  getChannels: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) return [];

      const lastScan = await db
        .select()
        .from(wifiScans)
        .where(eq(wifiScans.userId, ctx.user.id))
        .orderBy(desc(wifiScans.timestamp))
        .limit(1);

      if (!lastScan[0]) return [];

      const channels = await db
        .select()
        .from(wifiChannels)
        .where(eq(wifiChannels.scanId, lastScan[0].id))
        .orderBy(wifiChannels.canal);

      return channels;
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
        resolved: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) return [];

        let query = db
          .select()
          .from(wifiAlerts)
          .where(eq(wifiAlerts.userId, ctx.user.id));

        if (input.resolved !== undefined) {
          query = query.where(eq(wifiAlerts.resuelta, input.resolved));
        }

        const alerts = await query
          .orderBy(desc(wifiAlerts.timestamp))
          .limit(input.limit);

        return alerts;
      } catch (error) {
        console.error("[WiFi] Error fetching alerts:", error);
        return [];
      }
    }),

  // Obtener predicción más reciente
  getPrediction: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) return null;

      const prediction = await db
        .select()
        .from(wifiPredictions)
        .where(eq(wifiPredictions.userId, ctx.user.id))
        .orderBy(desc(wifiPredictions.timestamp))
        .limit(1);

      return prediction[0] || null;
    } catch (error) {
      console.error("[WiFi] Error fetching prediction:", error);
      return null;
    }
  }),

  // Obtener dashboard completo (datos actuales + histórico)
  getDashboard: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) {
        return {
          ok: false,
          sin_datos: true,
          ultimo_escaneo: null,
          canales: [],
          historico: [],
          prediccion: null,
          alertas: [],
        };
      }

      const lastScan = await db
        .select()
        .from(wifiScans)
        .where(eq(wifiScans.userId, ctx.user.id))
        .orderBy(desc(wifiScans.timestamp))
        .limit(1);

      if (!lastScan[0]) {
        return {
          ok: false,
          sin_datos: true,
          ultimo_escaneo: null,
          canales: [],
          historico: [],
          prediccion: null,
          alertas: [],
        };
      }

      const channels = await db
        .select()
        .from(wifiChannels)
        .where(eq(wifiChannels.scanId, lastScan[0].id));

      const history = await db
        .select()
        .from(wifiScans)
        .where(eq(wifiScans.userId, ctx.user.id))
        .orderBy(desc(wifiScans.timestamp))
        .limit(100);

      const prediction = await db
        .select()
        .from(wifiPredictions)
        .where(eq(wifiPredictions.userId, ctx.user.id))
        .orderBy(desc(wifiPredictions.timestamp))
        .limit(1);

      const alerts = await db
        .select()
        .from(wifiAlerts)
        .where(
          and(
            eq(wifiAlerts.userId, ctx.user.id),
            eq(wifiAlerts.resuelta, false)
          )
        )
        .orderBy(desc(wifiAlerts.timestamp))
        .limit(10);

      return {
        ok: true,
        sin_datos: false,
        ultimo_escaneo: lastScan[0],
        canales: channels,
        historico: history,
        prediccion: prediction[0] || null,
        alertas: alerts,
      };
    } catch (error) {
      console.error("[WiFi] Error fetching dashboard:", error);
      return {
        ok: false,
        sin_datos: true,
        ultimo_escaneo: null,
        canales: [],
        historico: [],
        prediccion: null,
        alertas: [],
      };
    }
  }),

  // Crear nuevo escaneo WiFi
  createScan: protectedProcedure
    .input(
      z.object({
        saturacionGeneral: z.number(),
        ocupacionEspectral: z.number(),
        perdidaPaquetes: z.number(),
        totalRedes: z.number(),
        tendenciaIA: z.number().optional(),
        canalOptimo: z.number().optional(),
        canales: z.array(
          z.object({
            canal: z.number(),
            saturacion: z.number(),
            ocupacionEspectral: z.number(),
            interferencia: z.number().optional(),
            perdidaPaquetes: z.number().optional(),
            riesgoAnomalia: z.number().optional(),
            rssi: z.number().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Crear escaneo
        const scan = await db.insert(wifiScans).values({
          userId: ctx.user.id,
          saturacionGeneral: input.saturacionGeneral,
          ocupacionEspectral: input.ocupacionEspectral,
          perdidaPaquetes: input.perdidaPaquetes,
          totalRedes: input.totalRedes,
          tendenciaIA: input.tendenciaIA,
          canalOptimo: input.canalOptimo,
        });

        const scanId = scan[0].insertId;

        // Crear canales
        for (const canal of input.canales) {
          await db.insert(wifiChannels).values({
            scanId: scanId,
            canal: canal.canal,
            saturacion: canal.saturacion,
            ocupacionEspectral: canal.ocupacionEspectral,
            interferencia: canal.interferencia,
            perdidaPaquetes: canal.perdidaPaquetes,
            riesgoAnomalia: canal.riesgoAnomalia,
            rssi: canal.rssi,
          });
        }

        // Detectar alertas automáticamente
        if (input.saturacionGeneral > 80) {
          await db.insert(wifiAlerts).values({
            userId: ctx.user.id,
            scanId: scanId,
            tipo: "saturacion",
            descripcion: `Saturación crítica: ${input.saturacionGeneral}%`,
            severidad: "critical",
          });
        }

        if (input.perdidaPaquetes > 20) {
          await db.insert(wifiAlerts).values({
            userId: ctx.user.id,
            scanId: scanId,
            tipo: "perdida",
            descripcion: `Pérdida alta: ${input.perdidaPaquetes}%`,
            severidad: "warning",
          });
        }

        return { ok: true, scanId };
      } catch (error) {
        console.error("[WiFi] Error creating scan:", error);
        throw new Error("No se pudo crear el escaneo");
      }
    }),

  // Crear predicción
  createPrediction: protectedProcedure
    .input(
      z.object({
        saturacionPredicha: z.number(),
        riesgoAnomalia: z.number(),
        canalOptimoPredicho: z.number().optional(),
        analisisPrediccion: z.string().optional(),
        confianza: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const prediction = await db.insert(wifiPredictions).values({
          userId: ctx.user.id,
          saturacionPredicha: input.saturacionPredicha,
          riesgoAnomalia: input.riesgoAnomalia,
          canalOptimoPredicho: input.canalOptimoPredicho,
          analisisPrediccion: input.analisisPrediccion,
          confianza: input.confianza,
        });

        return { ok: true, predictionId: prediction[0].insertId };
      } catch (error) {
        console.error("[WiFi] Error creating prediction:", error);
        throw new Error("No se pudo crear la predicción");
      }
    }),

  // Resolver alerta
  resolveAlert: protectedProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        await db
          .update(wifiAlerts)
          .set({ resuelta: true })
          .where(
            and(
              eq(wifiAlerts.id, input.alertId),
              eq(wifiAlerts.userId, ctx.user.id)
            )
          );

        return { ok: true };
      } catch (error) {
        console.error("[WiFi] Error resolving alert:", error);
        throw new Error("No se pudo resolver la alerta");
      }
    }),

  // Obtener estadísticas
  getStatistics: protectedProcedure
    .input(z.object({ timeRange: z.enum(["24h", "7d", "30d"]).default("24h") }))
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) {
          return {
            avgSaturacion: 0,
            avgOcupacion: 0,
            avgPerdida: 0,
            maxSaturacion: 0,
            alertCount: 0,
          };
        }

        const now = new Date();
        let startDate = new Date();

        if (input.timeRange === "24h") {
          startDate.setHours(now.getHours() - 24);
        } else if (input.timeRange === "7d") {
          startDate.setDate(now.getDate() - 7);
        } else if (input.timeRange === "30d") {
          startDate.setDate(now.getDate() - 30);
        }

        const scans = await db
          .select()
          .from(wifiScans)
          .where(
            and(
              eq(wifiScans.userId, ctx.user.id),
              gte(wifiScans.timestamp, startDate)
            )
          );

        if (scans.length === 0) {
          return {
            avgSaturacion: 0,
            avgOcupacion: 0,
            avgPerdida: 0,
            maxSaturacion: 0,
            alertCount: 0,
          };
        }

        const avgSaturacion =
          scans.reduce((sum: number, s: any) => sum + Number(s.saturacionGeneral), 0) / scans.length;
        const avgOcupacion =
          scans.reduce((sum: number, s: any) => sum + Number(s.ocupacionEspectral), 0) / scans.length;
        const avgPerdida =
          scans.reduce((sum: number, s: any) => sum + Number(s.perdidaPaquetes), 0) / scans.length;
        const maxSaturacion = Math.max(...scans.map((s: any) => Number(s.saturacionGeneral)));

        const alertsData = await db
          .select()
          .from(wifiAlerts)
          .where(
            and(
              eq(wifiAlerts.userId, ctx.user.id),
              gte(wifiAlerts.timestamp, startDate)
            )
          );
        const alertCount = alertsData.length;

        return {
          avgSaturacion: Math.round(avgSaturacion * 100) / 100,
          avgOcupacion: Math.round(avgOcupacion * 100) / 100,
          avgPerdida: Math.round(avgPerdida * 100) / 100,
          maxSaturacion: Math.round(maxSaturacion * 100) / 100,
          alertCount: alertCount.length,
        };
      } catch (error) {
        console.error("[WiFi] Error fetching statistics:", error);
        return {
          avgSaturacion: 0,
          avgOcupacion: 0,
          avgPerdida: 0,
          maxSaturacion: 0,
          alertCount: 0,
        };
      }
    }),
});
