import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { getAuditLogs, getUserAuditLogs, createAuditLog } from "../db";

export const auditRouter = router({
  getLogs: adminProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(({ input }) => getAuditLogs(input.limit, input.offset)),

  getUserLogs: protectedProcedure
    .input(z.object({ userId: z.number(), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(({ input }) => getUserAuditLogs(input.userId, input.limit, input.offset)),

  logAction: protectedProcedure
    .input(
      z.object({
        action: z.string(),
        entityType: z.string(),
        entityId: z.string().optional(),
        changes: z.record(z.string(), z.any()).optional(),
        ipAddress: z.string().optional(),
        userAgent: z.string().optional(),
        status: z.enum(["success", "failure"]).default("success"),
        errorMessage: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      createAuditLog({
        userId: ctx.user.id,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        changes: input.changes,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        status: input.status,
        errorMessage: input.errorMessage,
      })
    ),
});
