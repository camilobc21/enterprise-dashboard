import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getUserAIConversations, getAIConversationById, createAIConversation, updateAIConversation, createAIMessage, getConversationMessages } from "../db";
import axios from "axios";

const FLASK_API_URL = process.env.FLASK_API_URL || "https://wolverine-punctual-immorally.ngrok-free.dev";

// Obtener datos de WiFi desde Flask
async function getWiFiData() {
  try {
    const response = await axios.get(`${FLASK_API_URL}/api/dashboard`, { timeout: 5000 });
    return response.data;
  } catch (error) {
    console.error("Error fetching WiFi data:", error);
    return null;
  }
}

// Generar contexto para la IA basado en datos WiFi
function generateWiFiContext(wifiData: any): string {
  if (!wifiData || wifiData.sin_datos) {
    return "No hay datos de WiFi disponibles actualmente.";
  }

  const { ultimo_escaneo, redes, canales, prediccion, alertas } = wifiData;

  let context = `
## Datos Actuales de WiFi

### Escaneo Más Reciente
- Total de redes detectadas: ${ultimo_escaneo?.total_redes || 0}
- Canal óptimo recomendado: ${ultimo_escaneo?.canal_optimo || "N/A"}
- Saturación general: ${ultimo_escaneo?.saturacion_general || 0}%
- Ocupación espectral: ${ultimo_escaneo?.ocupacion_espectral || 0}%
- Pérdida de paquetes: ${ultimo_escaneo?.perdida_paquetes || 0}%

### Redes Detectadas (Top 5)
${redes?.slice(0, 5).map((r: any) => `- ${r.ssid} (Canal ${r.canal}, RSSI: ${r.rssi}dBm, ${r.encriptacion})`).join("\n")}

### Estado de Canales
${canales?.map((c: any) => `- Canal ${c.canal}: ${c.cantidad_redes} redes, ${c.saturacion}% saturación, ${c.anomalia ? "⚠️ ANOMALÍA" : "✓ Normal"}`).join("\n")}

### Predicción IA
- Canal predicho: ${prediccion?.canal_predicho || "N/A"}
- Confianza: ${prediccion?.confianza || 0}%
- Score espectral: ${prediccion?.score_espectral || 0}

### Alertas Activas (Últimas 5)
${alertas?.slice(0, 5).map((a: any) => `- [${a.severidad}] Canal ${a.canal}: ${a.descripcion}`).join("\n")}
  `;

  return context;
}

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
        title: input.title || "Nueva Conversación",
        systemPrompt: input.systemPrompt || `Eres un asistente experto en análisis de redes WiFi y espectro electromagnético. 
Tu rol es ayudar a analizar datos de escaneos WiFi, identificar problemas de interferencia, 
recomendar canales óptimos y predecir anomalías. Proporciona recomendaciones prácticas y 
explicaciones técnicas claras. Sé conciso pero informativo.`,
      })
    ),

  sendMessage: protectedProcedure
    .input(z.object({ conversationId: z.number(), message: z.string(), includeWiFiContext: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const conversation = await getAIConversationById(input.conversationId);
      if (!conversation || conversation.userId !== ctx.user.id) {
        throw new Error("Conversation not found or unauthorized");
      }

      const messages = await getConversationMessages(input.conversationId);
      const systemPrompt = conversation.systemPrompt || "You are a helpful assistant.";

      // Obtener contexto de WiFi si se solicita
      let contextMessage = "";
      if (input.includeWiFiContext) {
        const wifiData = await getWiFiData();
        contextMessage = generateWiFiContext(wifiData);
      }

      const llmMessages = [
        { role: "system" as const, content: systemPrompt },
        ...(contextMessage ? [{ role: "system" as const, content: `Contexto actual del sistema:\n${contextMessage}` }] : []),
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

  // Nuevo: Análisis automático de datos WiFi
  analyzeWiFiData: protectedProcedure
    .mutation(async ({ ctx }) => {
      const wifiData = await getWiFiData();
      if (!wifiData || wifiData.sin_datos) {
        return { analysis: "No hay datos de WiFi para analizar." };
      }

      const context = generateWiFiContext(wifiData);
      const prompt = `Analiza los siguientes datos de WiFi y proporciona:
1. Resumen del estado actual
2. Problemas identificados
3. Recomendaciones de optimización
4. Predicción de riesgos futuros

${context}`;

      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: "Eres un experto en análisis de redes WiFi. Proporciona análisis detallado y recomendaciones prácticas." },
          { role: "user" as const, content: prompt },
        ],
      });

      const analysis = response.choices[0]?.message?.content || "No se pudo generar análisis";
      return { analysis: typeof analysis === "string" ? analysis : "Error en análisis" };
    }),

  // Nuevo: Generar reporte automático
  generateReport: protectedProcedure
    .input(z.object({ format: z.enum(["text", "markdown", "html"]).optional() }))
    .mutation(async ({ ctx, input }) => {
      const wifiData = await getWiFiData();
      if (!wifiData || wifiData.sin_datos) {
        return { report: "No hay datos para generar reporte." };
      }

      const context = generateWiFiContext(wifiData);
      const prompt = `Genera un reporte profesional sobre el estado de la red WiFi basado en estos datos:

${context}

Incluye:
1. Ejecutivo
2. Métricas clave
3. Análisis de canales
4. Alertas y anomalías
5. Recomendaciones
6. Conclusiones

Formato: ${input.format || "markdown"}`;

      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: "Eres un experto en reportes técnicos de redes. Genera reportes profesionales, claros y accionables." },
          { role: "user" as const, content: prompt },
        ],
      });

      const report = response.choices[0]?.message?.content || "Error generando reporte";
      return { report: typeof report === "string" ? report : "Error en reporte" };
    }),

  // Nuevo: Obtener recomendaciones
  getRecommendations: protectedProcedure
    .mutation(async ({ ctx }) => {
      const wifiData = await getWiFiData();
      if (!wifiData || wifiData.sin_datos) {
        return { recommendations: [] };
      }

      const context = generateWiFiContext(wifiData);
      const prompt = `Basándote en estos datos de WiFi, proporciona 5 recomendaciones específicas y accionables para mejorar el rendimiento:

${context}

Formato: Lista JSON con estructura {id, prioridad, titulo, descripcion, impacto_estimado}`;

      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: "Eres un experto en optimización de redes WiFi. Proporciona recomendaciones prácticas y medibles." },
          { role: "user" as const, content: prompt },
        ],
      });

      const content = response.choices[0]?.message?.content || "[]";
      try {
        const recommendations = JSON.parse(typeof content === "string" ? content : "[]");
        return { recommendations };
      } catch {
        return { recommendations: [], rawResponse: content };
      }
    }),
});
