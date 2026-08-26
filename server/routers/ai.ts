import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { activateAIProviderConfig, createAIMessage, createAIConversation, deleteAIProviderConfig, getAIProviderConfigByKey, getAIConversationById, getConversationMessages, getUserAIConversations, listAIProviderConfigs, updateAIConversation, upsertAIProviderConfig } from "../db";
import { getConfiguredProviderStatus, invokeConfiguredAIChat, normalizeProviderBaseUrl } from "../ai/configuredProvider";
import { encryptProviderKey } from "../ai/providerSecrets";
import { resolveAIProviderModel } from "@shared/aiProviders";
import axios from "axios";

const FLASK_API_URL = process.env.FLASK_API_URL || "http://127.0.0.1:5000";

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
export function generateWiFiContext(wifiData: any): string {
  if (!wifiData || wifiData.sin_datos) {
    return "No hay datos de WiFi disponibles actualmente.";
  }

  const { ultimo_escaneo, redes, canales, historico } = wifiData;
  const display = (value: unknown, suffix = "") => value === null || value === undefined || value === "" ? "N/D" : `${value}${suffix}`;

  let context = `
## DATOS ACTUALES DE ANÁLISIS WIFI

### Escaneo Más Reciente
- Total de redes observadas: ${display(ultimo_escaneo?.total_redes)}
- Marca temporal: ${display(ultimo_escaneo?.timestamp)}
- Ocupación, interferencia, pérdida, predicciones y canal óptimo: N/D (el escaneo pasivo ESP32 no los mide)

### Redes WiFi Detectadas (Top 10)
${redes?.slice(0, 10).map((r: any) => `- **${r.ssid || "SSID oculto"}** | Canal: ${display(r.canal)} | RSSI: ${display(r.rssi, " dBm")} | Cifrado reportado: ${display(r.encriptacion)}`).join("\n") || "N/D"}

### Estado Detallado de Canales (1-13)
${canales?.map((c: any) => `Canal ${display(c.canal)}: ${display(c.cantidad_redes)} redes observadas`).join("\n") || "N/D"}

### Histórico de Últimos 20 Escaneos
${historico?.map((h: any) => `- Escaneo ${display(h.id)}: ${display(h.total_redes)} redes observadas, fecha: ${display(h.timestamp)}`).join("\n") || "N/D"}

### Regla obligatoria para el análisis
No inventes mediciones, predicciones ni el estado de una red. Diferencia explícitamente las observaciones recibidas de las recomendaciones generales y responde N/D cuando no exista evidencia.
  `;

  return context;
}

export const aiRouter = router({
  getProviderStatus: protectedProcedure.query(() => getConfiguredProviderStatus()),

  listProviderConfigs: adminProcedure.query(async () => {
    const configs = await listAIProviderConfigs();
    return configs.map((config) => ({ ...config, model: resolveAIProviderModel(config.providerName, config.model) }));
  }),

  saveProviderConfig: adminProcedure
    .input(z.object({
      configKey: z.string().trim().min(2).max(32).regex(/^[a-z0-9_-]+$/i, "El identificador del proveedor no es válido."),
      providerName: z.string().trim().min(2, "Ingresa el nombre del proveedor.").max(100),
      baseUrl: z.string().trim().url("Ingresa una URL válida.").max(500),
      model: z.string().trim().min(1, "Ingresa el modelo.").max(160),
      apiKey: z.string().trim().min(10, "La clave API parece demasiado corta.").max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getAIProviderConfigByKey(input.configKey);
      if (!input.apiKey && !existing) throw new Error("Pega una clave API para guardar un proveedor nuevo.");
      const config = await upsertAIProviderConfig({
        configKey: input.configKey,
        providerName: input.providerName,
        baseUrl: normalizeProviderBaseUrl(input.baseUrl, input.providerName),
        model: input.model,
        encryptedApiKey: input.apiKey ? encryptProviderKey(input.apiKey) : existing!.encryptedApiKey,
        updatedBy: ctx.user.id,
      });

      if (!config) throw new Error("No fue posible guardar la configuración de IA.");
      return getConfiguredProviderStatus();
    }),

  activateProviderConfig: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const provider = await activateAIProviderConfig(input.id);
      if (!provider) throw new Error("El proveedor seleccionado ya no existe.");
      return getConfiguredProviderStatus();
    }),

  deleteProviderConfig: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const deleted = await deleteAIProviderConfig(input.id);
      if (!deleted) throw new Error("El proveedor seleccionado ya no existe.");
      return { deleted: true };
    }),

  testProviderConnection: adminProcedure.mutation(async () => {
    const reply = await invokeConfiguredAIChat([
      { role: "system", content: "Responde solo con la palabra OK." },
      { role: "user", content: "Prueba de conexión" },
    ]);
    return { success: true, reply };
  }),

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

      const assistantMessage = await invokeConfiguredAIChat(llmMessages);

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

      const analysis = await invokeConfiguredAIChat([
          { role: "system" as const, content: "Eres un experto en análisis de redes WiFi. Proporciona análisis detallado, técnico y accionable basado ÚNICAMENTE en los datos proporcionados." },
          { role: "user" as const, content: prompt },
        ]);
      return { analysis };
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

      const report = await invokeConfiguredAIChat([
          { role: "system" as const, content: "Eres un experto en reportes técnicos de redes WiFi. Genera reportes profesionales, estructurados y basados en datos reales." },
          { role: "user" as const, content: prompt },
        ]);
      return { report };
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

      const content = await invokeConfiguredAIChat([
          { role: "system" as const, content: "Eres un experto en optimización de redes WiFi. Proporciona recomendaciones ESPECÍFICAS basadas ÚNICAMENTE en los datos reales proporcionados. Cada recomendación debe estar fundamentada en métricas concretas." },
          { role: "user" as const, content: prompt },
        ]);
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

      const interference = await invokeConfiguredAIChat([
          { role: "system" as const, content: "Eres un experto en análisis espectral WiFi 2.4GHz. Proporciona análisis técnico detallado." },
          { role: "user" as const, content: prompt },
        ]);
      return { interference };
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

      const predictions = await invokeConfiguredAIChat([
          { role: "system" as const, content: "Eres un experto en predicción de problemas de redes WiFi. Analiza tendencias y proporciona predicciones accionables." },
          { role: "user" as const, content: prompt },
        ]);
      return { predictions };
    }),
});
