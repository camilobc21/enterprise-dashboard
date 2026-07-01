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
  const getDashboardQuery = trpc.wifi.getDashboard.useQuery();

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

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    setIsLoading(true);
    const userMessage = inputValue;
    setInputValue("");

    // Agregar mensaje del usuario
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    try {
      // Crear contexto con datos WiFi
      const context = wifiData
        ? `Datos actuales de WiFi:
- Saturación General: ${wifiData.saturacion_general}%
- Ocupación Espectral: ${wifiData.ocupacion_espectral}%
- Pérdida de Paquetes: ${wifiData.perdida_paquetes}%
- Total de Redes: ${wifiData.total_redes}
- Canales Detectados: ${wifiData.canales?.length || 0}

Pregunta del usuario: ${userMessage}`
        : userMessage;

      const response = await sendMessage.mutateAsync({
        conversationId: 1,
        message: context,
        includeWiFiContext: true,
      });

      // Agregar respuesta de IA
      setMessages((prev) => [...prev, { role: "assistant", content: response.assistantMessage }]);
    } catch (error) {
      console.error("Error enviando mensaje:", error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Error al procesar tu mensaje. Intenta de nuevo." }]);
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
      const response = await sendMessage.mutateAsync({
        conversationId: 1,
        message: `Basándote en estos datos de WiFi: Saturación ${wifiData.saturacion_general}%, Ocupación ${wifiData.ocupacion_espectral}%, Pérdida ${wifiData.perdida_paquetes}%. Dame 5-7 recomendaciones específicas y medibles.`,
        includeWiFiContext: true,
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
          <Badge variant="outline" className="bg-green-50 text-green-700">
            {getDashboardQuery.isLoading ? "Cargando..." : "Conectado"}
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
                <div className="h-96 overflow-y-auto border rounded-lg p-4 space-y-4 bg-muted/50">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <p>Inicia una conversación sobre tu red WiFi</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-xs p-3 rounded-lg ${msg.role === "user" ? "bg-blue-500 text-white" : "bg-white border"}`}>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Escribe tu pregunta..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    disabled={isLoading}
                  />
                  <Button onClick={handleSendMessage} disabled={isLoading} size="icon">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis">
            <Card>
              <CardHeader>
                <CardTitle>Análisis Actual</CardTitle>
                <CardDescription>Estado en tiempo real de tu red</CardDescription>
              </CardHeader>
              <CardContent>
                {wifiData ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Saturación General</p>
                      <p className="text-2xl font-bold">{wifiData.saturacion_general}%</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Ocupación Espectral</p>
                      <p className="text-2xl font-bold">{wifiData.ocupacion_espectral}%</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Pérdida de Paquetes</p>
                      <p className="text-2xl font-bold">{wifiData.perdida_paquetes}%</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Total de Redes</p>
                      <p className="text-2xl font-bold">{wifiData.total_redes}</p>
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
