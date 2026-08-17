import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { getAIChatErrorMessage } from "@/lib/aiErrors";
import { Send, FileDown, BarChart3, AlertCircle, Lightbulb, Zap } from "lucide-react";
import { Streamdown } from "streamdown";

export default function AIChat() {
  const { user, loading, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [wifiData, setWifiData] = useState<any>(null);
  const [report, setReport] = useState("");
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const createConversation = trpc.ai.createConversation.useMutation();
  const sendMessage = trpc.ai.sendMessage.useMutation();
  const generateReport = trpc.export.generateWiFiReportPDF.useMutation();
  const getDashboardQuery = trpc.wifi.getDashboard.useQuery(undefined, {
    refetchInterval: 30000, // Actualizar cada 30 segundos (igual que ESP8266)
    enabled: true,
  });
  const providerStatusQuery = trpc.ai.getProviderStatus.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = "/";
    }
  }, [loading, isAuthenticated]);

  useEffect(() => {
    if (getDashboardQuery.data?.ultimo_escaneo) {
      setWifiData(getDashboardQuery.data.ultimo_escaneo);
    } else if (getDashboardQuery.data) {
      // Datos de ejemplo si no hay escaneo
      setWifiData({
        saturacion_general: 45,
        ocupacion_espectral: 52,
        perdida_paquetes: 2,
        total_redes: 12,
        canales: [1, 6, 11],
      });
    }
  }, [getDashboardQuery.data]);

  // Crear conversación automáticamente al cargar
  useEffect(() => {
    if (!loading && isAuthenticated && messages.length === 0) {
      createConversation.mutate(
        {
          title: "Análisis WiFi en Tiempo Real",
          systemPrompt: `Eres un experto en análisis de redes WiFi 2.4GHz con especialidad en:
- Optimización de canales (1-13)
- Análisis de interferencia espectral
- Detección de anomalías
- Predicción de problemas de conectividad
- Recomendaciones prácticas de configuración

Tienes acceso a datos en TIEMPO REAL del sistema WiFi.
Analiza datos técnicos reales y proporciona recomendaciones específicas, medibles y accionables.
Siempre fundamenta tus análisis en los datos proporcionados.
Sé conciso pero técnicamente preciso.
Siempre menciona las métricas específicas del sistema actual.`,
        },
        {
          onSuccess: (data: any) => {
            // Guardar ID de conversación para usar en sendMessage
            if (data && typeof data === 'object' && 'id' in data) {
              localStorage.setItem("wifiChatConversationId", (data as any).id.toString());
            }
          },
        }
      );
    }
  }, [loading, isAuthenticated]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    if (!providerStatusQuery.data?.configured) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "La IA aún no está configurada. Un administrador debe añadir la clave API en Gestión de roles.",
      }]);
      return;
    }

    setIsLoading(true);
    const userMessage = inputValue;
    setInputValue("");

    // Agregar mensaje del usuario
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      // Obtener ID de conversación del localStorage o usar 1 como default
      const conversationId = parseInt(localStorage.getItem("wifiChatConversationId") || "1");

      // Enviar mensaje con contexto WiFi SIEMPRE habilitado
      const response = await sendMessage.mutateAsync({
        conversationId,
        message: userMessage,
        includeWiFiContext: true, // SIEMPRE incluir contexto en tiempo real
      });

      // Agregar respuesta de IA
      setMessages((prev) => [...prev, { role: "assistant", content: response.assistantMessage }]);
    } catch (error) {
      console.error("Error enviando mensaje:", error);
      setMessages((prev) => [...prev, { role: "assistant", content: getAIChatErrorMessage(error) }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!wifiData) return;

    try {
      const reportData = await generateReport.mutateAsync({
        title: "Análisis WiFi - Reporte Generado",
        data: {
          saturacion: wifiData.saturacion_general || 0,
          ocupacion: wifiData.ocupacion_espectral || 0,
          perdida: wifiData.perdida_paquetes || 0,
          canales: (getDashboardQuery.data?.canales || []).slice(0, 5).map((canal: any) => ({
            canal: canal.canal,
            saturacion: canal.saturacion || 0,
            interferencia: canal.interferencia_adyacente || 0,
            riesgo: canal.anomalia ? "Alto" : "Bajo",
          })),
          recomendaciones: [
            "Optimizar ubicación del router",
            "Cambiar a canal menos congestionado",
            "Actualizar firmware del dispositivo",
            "Reducir interferencia de dispositivos 2.4GHz",
          ],
          timestamp: new Date().toISOString(),
        },
      });

      // Si hay PDF, descargarlo
      if (reportData.pdf) {
        const binaryString = atob(reportData.pdf);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = reportData.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setReport("✅ Reporte PDF descargado exitosamente");
      } else if (reportData.html) {
        setReport(reportData.html);
      }
    } catch (error) {
      console.error("Error generando reporte:", error);
      setReport("Error al generar el reporte");
    }
  };

  const handleGetRecommendations = async () => {
    if (!wifiData) return;

    try {
      const conversationId = parseInt(localStorage.getItem("wifiChatConversationId") || "1");
      const response = await sendMessage.mutateAsync({
        conversationId,
        message: `Dame 5-7 recomendaciones específicas y medibles basadas en los datos actuales de WiFi.`,
        includeWiFiContext: true, // Contexto en tiempo real automático
      });

      // Parsear recomendaciones de la respuesta
      const recs = response.assistantMessage.split("\n").filter((line: string) => line.trim().length > 0);
      setRecommendations(recs);
    } catch (error) {
      console.error("Error obteniendo recomendaciones:", error);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Chat IA - Análisis WiFi</h1>
            <p className="text-muted-foreground mt-2">Asistente inteligente para optimización de red</p>
          </div>
          <Badge variant="outline" className={providerStatusQuery.data?.configured ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}>
            {providerStatusQuery.isLoading ? "Verificando IA..." : providerStatusQuery.data?.configured ? "IA configurada" : "IA sin configurar"}
          </Badge>
        </div>

        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chat">💬 Chat</TabsTrigger>
            <TabsTrigger value="analysis">📊 Análisis</TabsTrigger>
            <TabsTrigger value="report">📄 Reporte</TabsTrigger>
            <TabsTrigger value="recommendations">💡 Recomendaciones</TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <CardTitle>Chat Inteligente</CardTitle>
                <CardDescription>Haz preguntas sobre tu red WiFi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!providerStatusQuery.data?.configured && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    La clave API todavía no está configurada. Un administrador puede añadirla en <strong>Gestión de roles</strong>.
                  </div>
                )}
                <div className="h-96 overflow-y-auto border rounded-lg p-4 space-y-4 bg-muted/50">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <div className="space-y-2">
                        <p className="font-medium">Asistente WiFi IA - Datos en Tiempo Real</p>
                        <p className="text-xs">Haz preguntas sobre tu red. La IA usa datos actuales automáticamente.</p>
                        {wifiData && (
                          <div className="text-xs mt-4 p-2 bg-blue-50 rounded">
                            <p>📊 Datos actuales:</p>
                            <p>Saturación: {wifiData.saturacion_general}% | Ocupación: {wifiData.ocupacion_espectral}% | Redes: {wifiData.total_redes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-xs p-3 rounded-lg ${msg.role === "user" ? "bg-blue-500 text-white" : "bg-white border"}`}>
                          <Streamdown>{msg.content}</Streamdown>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  {getDashboardQuery.isLoading && (
                    <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                      🔄 Actualizando datos en tiempo real...
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Pregunta sobre tu red WiFi (datos en tiempo real)..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      disabled={isLoading || !providerStatusQuery.data?.configured}
                    />
                    <Button onClick={handleSendMessage} disabled={isLoading || !providerStatusQuery.data?.configured} size="icon">
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis">
            <Card>
              <CardHeader>
                <CardTitle>Análisis Actual</CardTitle>
                <CardDescription>Estado en tiempo real de tu red (Actualiza cada 30s)</CardDescription>
              </CardHeader>
              <CardContent>
                {wifiData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-transparent">
                        <p className="text-sm text-muted-foreground">Saturación General</p>
                        <p className="text-2xl font-bold text-blue-600">{wifiData.saturacion_general}%</p>
                        <p className="text-xs text-muted-foreground mt-1">{wifiData.saturacion_general > 70 ? '⚠️ Crítico' : wifiData.saturacion_general > 50 ? '⚡ Alto' : '✅ Normal'}</p>
                      </div>
                      <div className="p-4 border rounded-lg bg-gradient-to-br from-green-50 to-transparent">
                        <p className="text-sm text-muted-foreground">Ocupación Espectral</p>
                        <p className="text-2xl font-bold text-green-600">{wifiData.ocupacion_espectral}%</p>
                        <p className="text-xs text-muted-foreground mt-1">Ancho de banda usado</p>
                      </div>
                      <div className="p-4 border rounded-lg bg-gradient-to-br from-red-50 to-transparent">
                        <p className="text-sm text-muted-foreground">Pérdida de Paquetes</p>
                        <p className="text-2xl font-bold text-red-600">{wifiData.perdida_paquetes}%</p>
                        <p className="text-xs text-muted-foreground mt-1">{wifiData.perdida_paquetes > 5 ? '⚠️ Problemas' : '✅ Normal'}</p>
                      </div>
                      <div className="p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-transparent">
                        <p className="text-sm text-muted-foreground">Total de Redes</p>
                        <p className="text-2xl font-bold text-purple-600">{wifiData.total_redes}</p>
                        <p className="text-xs text-muted-foreground mt-1">Detectadas</p>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                      <p className="font-medium">💡 Tip:</p>
                      <p>Pregunta al chat: "¿Cuál es el mejor canal para usar?" o "¿Qué problemas ves en mi red?"</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Cargando datos...</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Report Tab */}
          <TabsContent value="report">
            <Card>
              <CardHeader>
                <CardTitle>Generar Reporte</CardTitle>
                <CardDescription>Crea un reporte PDF con análisis completo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleGenerateReport} disabled={!wifiData || generateReport.isPending} className="w-full">
                  <FileDown className="w-4 h-4 mr-2" />
                  {generateReport.isPending ? "Generando..." : "Generar Reporte PDF"}
                </Button>

                {report && (
                  <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                    {report.includes("✅") ? (
                      <div className="text-center py-4 text-green-600 font-medium">{report}</div>
                    ) : (
                      <Streamdown>{report}</Streamdown>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations">
            <Card>
              <CardHeader>
                <CardTitle>Recomendaciones Personalizadas</CardTitle>
                <CardDescription>Sugerencias basadas en tu red actual</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleGetRecommendations} disabled={!wifiData || isLoading} className="w-full">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Obtener Recomendaciones
                </Button>

                {recommendations.length > 0 && (
                  <div className="space-y-2">
                    {recommendations.map((rec, idx) => (
                      <div key={idx} className="p-3 border rounded-lg bg-amber-50">
                        <p className="text-sm font-medium">{rec}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
