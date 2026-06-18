import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { notifications } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";

export const alertsRouter = router({
  // Obtener alertas del usuario
  getAlerts: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        type: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) return [];

        const result = await db
          .select()
          .from(notifications)
          .where(eq(notifications.userId, ctx.user!.id))
          .orderBy(desc(notifications.createdAt))
          .limit(input.limit);

        return result;
      } catch (error) {
        console.error("[Alerts] Error getting alerts:", error);
        return [];
      }
    }),

  // Obtener alertas sin leer
  getUnreadAlerts: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) return [];

      const result = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.userId, ctx.user!.id), eq(notifications.isRead, false)))
        .orderBy(desc(notifications.createdAt));

      return result;
    } catch (error) {
      console.error("[Alerts] Error getting unread alerts:", error);
      return [];
    }
  }),

  // Marcar alerta como leída
  markAsRead: protectedProcedure
    .input(z.object({ alertId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) return { success: false };

        await db
          .update(notifications)
          .set({ isRead: true })
          .where(eq(notifications.id, input.alertId));

        return { success: true };
      } catch (error) {
        console.error("[Alerts] Error marking alert as read:", error);
        return { success: false };
      }
    }),

  // Crear alerta (desde backend)
  createAlert: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        message: z.string(),
        type: z.enum(["info", "success", "warning", "error"]),
        actionUrl: z.string().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = await getDb();
        if (!db) return { success: false };

        await db.insert(notifications).values({
          userId: ctx.user!.id,
          title: input.title,
          message: input.message,
          type: input.type,
          actionUrl: input.actionUrl || null,
          isRead: false,
          metadata: JSON.stringify(input.metadata || {}),
        });

        return { success: true };
      } catch (error) {
        console.error("[Alerts] Error creating alert:", error);
        return { success: false };
      }
    }),

  // Obtener estadísticas de alertas
  getAlertStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) return { total: 0, warning: 0, error: 0, success: 0, unread: 0 };

      const userNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, ctx.user!.id));

      return {
        total: userNotifications.length,
        warning: userNotifications.filter((n) => n.type === "warning").length,
        error: userNotifications.filter((n) => n.type === "error").length,
        success: userNotifications.filter((n) => n.type === "success").length,
        unread: userNotifications.filter((n) => !n.isRead).length,
      };
    } catch (error) {
      console.error("[Alerts] Error getting alert stats:", error);
      return { total: 0, warning: 0, error: 0, success: 0, unread: 0 };
    }
  }),
});
