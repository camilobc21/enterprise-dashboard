import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getUserDocuments, getDocumentById, createDocument, deleteDocument } from "../db";
import { storagePut } from "../storage";

export const documentsRouter = router({
  getDocuments: protectedProcedure
    .input(z.object({ limit: z.number().default(50), offset: z.number().default(0) }))
    .query(({ ctx, input }) => getUserDocuments(ctx.user.id, input.limit, input.offset)),

  getDocument: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getDocumentById(input.id)),

  upload: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileData: z.string(),
        mimeType: z.string(),
        fileSize: z.number(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        isPublic: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const fileBuffer = Buffer.from(input.fileData, "base64");
      const { key, url } = await storagePut(
        `${ctx.user.id}-documents/${input.fileName}`,
        fileBuffer,
        input.mimeType
      );

      return createDocument({
        userId: ctx.user.id,
        fileName: input.fileName,
        fileKey: key,
        fileUrl: url,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        description: input.description,
        tags: input.tags,
        isPublic: input.isPublic,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteDocument(input.id)),
});
