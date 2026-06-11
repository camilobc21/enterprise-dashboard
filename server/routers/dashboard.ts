import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getUserDashboardMetrics, createDashboardMetric, updateDashboardMetric } from "../db";

export const dashboardRouter = router({
  getMetrics: protectedProcedure.query(({ ctx }) =>
    getUserDashboardMetrics(ctx.user.id)
  ),

  createMetric: protectedProcedure
    .input(
      z.object({
        metricName: z.string(),
        metricType: z.enum(["kpi", "chart", "statistic"]),
        value: z.string().optional(),
        label: z.string().optional(),
        description: z.string().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      createDashboardMetric({
        userId: ctx.user.id,
        metricName: input.metricName,
        metricType: input.metricType,
        value: input.value,
        label: input.label,
        description: input.description,
        metadata: input.metadata,
      })
    ),

  updateMetric: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        value: z.string().optional(),
        label: z.string().optional(),
        description: z.string().optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(({ input }) => {
      const { id, ...updateData } = input;
      return updateDashboardMetric(id, updateData);
    }),
});
