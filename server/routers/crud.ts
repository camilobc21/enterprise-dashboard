import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getUserCRUDRecords, getCRUDRecordById, createCRUDRecord, updateCRUDRecord, deleteCRUDRecord } from "../db";

export const crudRouter = router({
  getRecords: protectedProcedure
    .input(z.object({ recordType: z.string().optional(), limit: z.number().default(50), offset: z.number().default(0) }))
    .query(({ ctx, input }) => getUserCRUDRecords(ctx.user.id, input.recordType, input.limit, input.offset)),

  getRecord: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getCRUDRecordById(input.id)),

  create: protectedProcedure
    .input(
      z.object({
        recordType: z.string(),
        title: z.string(),
        description: z.string().optional(),
        data: z.record(z.string(), z.any()),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(({ ctx, input }) =>
      createCRUDRecord({
        userId: ctx.user.id,
        recordType: input.recordType,
        title: input.title,
        description: input.description,
        data: input.data,
        priority: input.priority,
        tags: input.tags,
        status: "active",
      })
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        data: z.record(z.string(), z.any()).optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(({ input }) => {
      const { id, ...updateData } = input;
      return updateCRUDRecord(id, updateData);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteCRUDRecord(input.id)),
});
