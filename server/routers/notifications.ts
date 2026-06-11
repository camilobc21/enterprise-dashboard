import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getUserNotifications, getUnreadNotifications, createNotification, markNotificationAsRead } from "../db";

export const notificationsRouter = router({
  getNotifications: protectedProcedure
    .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
    .query(({ ctx, input }) => getUserNotifications(ctx.user.id, input.limit, input.offset)),

  getUnread: protectedProcedure.query(({ ctx }) => getUnreadNotifications(ctx.user.id)),

  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(({ input }) => markNotificationAsRead(input.notificationId)),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        message: z.string(),
        type: z.enum(["info", "success", "warning", "error"]).default("info"),
        actionUrl: z.string().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      createNotification({
        userId: ctx.user.id,
        title: input.title,
        message: input.message,
        type: input.type,
        actionUrl: input.actionUrl,
        metadata: input.metadata,
      })
    ),
});
