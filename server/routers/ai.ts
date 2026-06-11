import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getUserAIConversations, getAIConversationById, createAIConversation, updateAIConversation, createAIMessage, getConversationMessages } from "../db";

export const aiRouter = router({
  getConversations: protectedProcedure.query(({ ctx }) => getUserAIConversations(ctx.user.id)),

  getConversation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getAIConversationById(input.id)),

  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(({ input }) => getConversationMessages(input.conversationId)),

  createConversation: protectedProcedure
    .input(z.object({ title: z.string().optional(), systemPrompt: z.string().optional() }))
    .mutation(({ ctx, input }) =>
      createAIConversation({
        userId: ctx.user.id,
        title: input.title,
        systemPrompt: input.systemPrompt,
      })
    ),

  sendMessage: protectedProcedure
    .input(z.object({ conversationId: z.number(), message: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await getAIConversationById(input.conversationId);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversation not found or unauthorized");
      }

      const messages = await getConversationMessages(input.conversationId);
      const systemPrompt = conversation.systemPrompt || "You are a helpful assistant.";

      const llmMessages = [
        { role: "system" as const, content: systemPrompt },
        ...messages.map((msg) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: msg.content,
        })),
        { role: "user" as const, content: input.message },
      ];

      await createAIMessage({
        conversationId: input.conversationId,
        role: "user",
        content: input.message,
      });

      const response = await invokeLLM({ messages: llmMessages });
      const assistantContent = response.choices[0]?.message?.content;
      const assistantMessage = typeof assistantContent === "string" ? assistantContent : "No response";

      await createAIMessage({
        conversationId: input.conversationId,
        role: "assistant",
        content: assistantMessage,
      });

      await updateAIConversation(input.conversationId, { updatedAt: new Date() });

      return { userMessage: input.message, assistantMessage };
    }),
});
