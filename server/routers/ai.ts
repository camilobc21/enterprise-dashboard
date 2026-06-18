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

// Generar contexto detallado para la IA basado en datos WiFi
function generateWiFiContext(wifiData: any): string {
  if (!wifiData || wifiData.sin_datos) {
    return "No hay datos de WiFi disponibles actualmente.";
  }

  const { ultimo_escaneo, redes, canales, prediccion, alertas, historico } = wifiData;

  let context = `
## DATOS ACTUALES DE ANÁLISIS WIFI

### Escaneo Más Reciente
- Total de redes detectadas: ${ultimo_escaneo?.total_redes || 0}
- Canal óptimo predicho: ${ultimo_escaneo?.canal_optimo || "N/A"}
- Saturación general: ${ultimo_escaneo?.saturacion_general || 0}%
- Ocupación espectral global: ${ultimo_escaneo?.ocupacion_espectral || 0}%
- Pérdida de paquetes: ${ultimo_escaneo?.perdida_paquetes || 0}%
- Tendencia IA: ${ultimo_escaneo?.tendencia_ia || 0}
- Timestamp: ${ultimo_escaneo?.timestamp || "N/A"}

### Redes WiFi Detectadas (Top 10)
${redes?.slice(0, 10).map((r: any) => `- **${r.ssid}** | Canal: ${r.canal} | RSSI: ${r.rssi}dBm | Ancho: ${r.ancho_banda}MHz | Encriptación: ${r.encriptacion}`).join("\n")}

### Estado Detallado de Canales (1-13)
${canales?.map((c: any) => {
  const estado = c.anomalia ? "🔴 ANOMALÍA" : c.saturacion >= 70 ? "🟡 CRÍTICO" : "🟢 NORMAL";
  return `Canal ${c.canal}: ${estado} | Redes: ${c.cantidad_redes} | Saturación: ${c.saturacion}% | Ocupación Espectral: ${c.ocupacion_espectral}% | Interferencia Adyacente: ${c.interferencia_adyacente}% | Pérdida: ${c.perdida_paquetes}% | Riesgo: ${c.riesgo_anomalia}%`;
}).join("\n")}

### Predicción IA
- Canal predicho: ${prediccion?.canal_predicho || "N/A"}
- Confianza: ${prediccion?.confianza || 0}%
- Score espectral: ${prediccion?.score_espectral || 0}
- Detalle: ${prediccion?.detalle || "N/A"}

### Alertas Activas (Últimas 10)
${alertas?.slice(0, 10).map((a: any) => `- [${a.severidad}] Canal ${a.canal} - ${a.tipo}: ${a.descripcion}`).join("\n")}

### Histórico de Últimos 20 Escaneos
${historico?.map((h: any) => `- Escaneo ${h.id}: ${h.total_redes} redes, Saturación: ${h.saturacion_general}%, Ocupación: ${h.ocupacion_espectral}%, Pérdida: ${h.perdida_paquetes}%, Tendencia: ${h.tendencia_ia}`).join("\n")}
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
        systemPrompt: input.systemPrompt || `Eres un experto en análisis de redes WiFi 2.4GHz con especialidad en:
- Optimización de canales (1-13)
- Análisis de interferencia espectral
- Detección de anomalías
- Predicción de problemas de conectividad
- Recomendaciones prácticas de configuración

Analiza datos técnicos reales y proporciona recomendaciones específicas, medibles y accionables.
Siempre fundamenta tus análisis en los datos proporcionados.
Sé conciso pero técnicamente preciso.`,
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
        ...(contextMessage ? [{ role: "system" as const, content: `CONTEXTO ACTUAL DEL SISTEMA:\n${contextMessage}` }] : []),
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

  // Análisis automático de datos WiFi
  analyzeWiFiData: protectedProcedure
    .mutation(async ({ ctx }) => {
      const wifiData = await getWiFiData();
      if (!wifiData || wifiData.sin_datos) {
        return { analysis: "No hay datos de WiFi para analizar." };
      }

      const context = generateWiFiContext(wifiData);
      const prompt = `Analiza los siguientes datos de WiFi y proporciona:

1. **Resumen del Estado Actual**: Evaluación general de la salud de la red
2. **Problemas Críticos Identificados**: Canales con anomalías, alta interferencia, pérdida de paquetes
3. **Análisis de Canales**: Cuáles están sobrecargados, cuáles están subutilizados
4. **Interferencia Espectral**: Canales que interfieren entre sí
5. **Recomendaciones de Optimización**: Acciones específicas para mejorar rendimiento
6. **Predicción de Riesgos**: Qué problemas podrían ocurrir si no se toman acciones

${context}`;

      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: "Eres un experto en análisis de redes WiFi. Proporciona análisis detallado, técnico y accionable basado ÚNICAMENTE en los datos proporcionados." },
          { role: "user" as const, content: prompt },
        ],
      });

      const analysis = response.choices[0]?.message?.content || "No se pudo generar análisis";
      return { analysis: typeof analysis === "string" ? analysis : "Error en análisis" };
    }),

  // Generar reporte automático
  generateReport: protectedProcedure
    .input(z.object({ format: z.enum(["text", "markdown", "html"]).optional() }))
    .mutation(async ({ ctx, input }) => {
      const wifiData = await getWiFiData();
      if (!wifiData || wifiData.sin_datos) {
        return { report: "No hay datos para generar reporte." };
      }

      const context = generateWiFiContext(wifiData);
      const prompt = `Genera un reporte profesional y detallado sobre el estado de la red WiFi:

${context}

El reporte debe incluir:

1. **Resumen Ejecutivo**: Evaluación general en 2-3 líneas
2. **Métricas Clave**: Tabla con saturación, ocupación, pérdida por canal
3. **Análisis de Canales**: Detalle de cada canal con estado y recomendaciones
4. **Anomalías Detectadas**: Lista de problemas identificados
5. **Interferencia Espectral**: Análisis de solapamiento entre canales
6. **Predicciones IA**: Tendencias y riesgos futuros
7. **Plan de Acción**: Recomendaciones priorizadas por impacto
8. **Conclusiones**: Resumen de hallazgos principales

Formato: ${input.format || "markdown"}`;

      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: "Eres un experto en reportes técnicos de redes WiFi. Genera reportes profesionales, estructurados y basados en datos reales." },
          { role: "user" as const, content: prompt },
        ],
      });

      const report = response.choices[0]?.message?.content || "Error generando reporte";
      return { report: typeof report === "string" ? report : "Error en reporte" };
    }),

  // Obtener recomendaciones específicas
  getRecommendations: protectedProcedure
    .mutation(async ({ ctx }) => {
      const wifiData = await getWiFiData();
      if (!wifiData || wifiData.sin_datos) {
        return { recommendations: [] };
      }

      const context = generateWiFiContext(wifiData);
      const prompt = `Basándote en estos datos REALES de WiFi, genera 5-7 recomendaciones específicas, medibles y accionables.

IMPORTANTE: Las recomendaciones DEBEN estar fundamentadas en los datos específicos del sistema.

${context}

Para cada recomendación, proporciona:
1. Título claro
2. Descripción técnica detallada
3. Prioridad (CRÍTICA, ALTA, MEDIA, BAJA)
4. Impacto estimado (mejora esperada en %)
5. Pasos de implementación

Formato JSON estricto:
[
  {
    "id": 1,
    "titulo": "Cambiar canal de X a Y",
    "descripcion": "Descripción técnica específica",
    "prioridad": "ALTA",
    "impacto_estimado": "25%",
    "pasos": ["paso 1", "paso 2", "paso 3"]
  }
]`;

      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: "Eres un experto en optimización de redes WiFi. Proporciona recomendaciones ESPECÍFICAS basadas ÚNICAMENTE en los datos reales proporcionados. Cada recomendación debe estar fundamentada en métricas concretas." },
          { role: "user" as const, content: prompt },
        ],
      });

      const content = response.choices[0]?.message?.content || "[]";
      try {
        // Extraer JSON del contenido si está envuelto en markdown
        const jsonMatch = typeof content === "string" ? content.match(/\[[\s\S]*\]/g) : null;
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        const recommendations = JSON.parse(typeof jsonStr === "string" ? jsonStr : "[]");
        return { recommendations };
      } catch {
        return { recommendations: [], rawResponse: content };
      }
    }),

  // Análisis de interferencia espectral
  analyzeInterference: protectedProcedure
    .mutation(async ({ ctx }) => {
      const wifiData = await getWiFiData();
      if (!wifiData || wifiData.sin_datos) {
        return { interference: "No hay datos disponibles" };
      }

      const context = generateWiFiContext(wifiData);
      const prompt = `Analiza la interferencia espectral en los datos WiFi proporcionados:

${context}

Proporciona:
1. Matriz de interferencia entre canales
2. Canales que más interfieren
3. Canales óptimos no solapados (1, 6, 11)
4. Recomendaciones para minimizar interferencia
5. Impacto de la interferencia en pérdida de paquetes`;

      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: "Eres un experto en análisis espectral WiFi 2.4GHz. Proporciona análisis técnico detallado." },
          { role: "user" as const, content: prompt },
        ],
      });

      const interference = response.choices[0]?.message?.content || "No se pudo analizar";
      return { interference: typeof interference === "string" ? interference : "Error" };
    }),

  // Predicción de anomalías futuras
  predictAnomalies: protectedProcedure
    .mutation(async ({ ctx }) => {
      const wifiData = await getWiFiData();
      if (!wifiData || wifiData.sin_datos) {
        return { predictions: "No hay datos disponibles" };
      }

      const context = generateWiFiContext(wifiData);
      const prompt = `Basándote en el histórico y tendencias de datos WiFi, predice posibles anomalías futuras:

${context}

Proporciona:
1. Canales en riesgo de saturación
2. Patrones de interferencia que podrían empeorar
3. Predicción de pérdida de paquetes futura
4. Ventana de tiempo estimada para problemas
5. Acciones preventivas recomendadas`;

      const response = await invokeLLM({
        messages: [
          { role: "system" as const, content: "Eres un experto en predicción de problemas de redes WiFi. Analiza tendencias y proporciona predicciones accionables." },
          { role: "user" as const, content: prompt },
        ],
      });

      const predictions = response.choices[0]?.message?.content || "No se pudo predecir";
      return { predictions: typeof predictions === "string" ? predictions : "Error" };
    }),
});
