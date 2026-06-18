import { useEffect, useState } from "react";
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
import axios from "axios";

const FLASK_API_URL = import.meta.env.VITE_FLASK_API_URL || "https://wolverine-punctual-immorally.ngrok-free.dev";

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

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = "/";
    }
  }, [loading, isAuthenticated]);

  useEffect(() => {
    loadWiFiData();
  }, []);

  const loadWiFiData = async () => {
    try {
      const response = await axios.get(`${FLASK_API_URL}/api/dashboard`, { timeout: 5000 });
      setWifiData(response.data);
    } catch (error) {
      console.error("Error cargando datos WiFi:", error);
    }
  };

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
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error al procesar tu pregunta. Intenta de nuevo." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!wifiData) return;

    try {
      const reportData = {
        title: "Análisis WiFi IA Pro",
        data: {
          saturacion: wifiData.saturacion_general || 0,
          ocupacion: wifiData.ocupacion_espectral || 0,
          perdida: wifiData.perdida_paquetes || 0,
          canales: (wifiData.canales || []).map((c: any) => ({
            canal: c.canal,
            saturacion: c.saturacion || 0,
            interferencia: c.interferencia_adyacente || 0,
            riesgo: c.riesgo_anomalia || "Bajo",
          })),
          recomendaciones: recommendations,
          timestamp: new Date().toISOString(),
        },
      };

      const result = await generateReport.mutateAsync(reportData);

      // Descargar HTML como PDF
      const element = document.createElement("a");
      element.setAttribute("href", "data:text/html;charset=utf-8," + encodeURIComponent(result.html));
      element.setAttribute("download", result.filename);
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (error) {
      console.error("Error generando reporte:", error);
    }
  };

  if (loading) {
    return <DashboardLayout><Skeleton className="w-full h-screen" /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="w-8 h-8" />
            Chat IA - Análisis WiFi
          </h1>
          <p className="text-muted-foreground">Asistente inteligente para análisis y recomendaciones de red</p>
        </div>

        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="analysis">Análisis</TabsTrigger>
            <TabsTrigger value="report">Reporte</TabsTrigger>
            <TabsTrigger value="recommendations">Recomendaciones</TabsTrigger>
          </TabsList>

          {/* TAB: CHAT */}
          <TabsContent value="chat" className="space-y-4">
            <Card className="h-[500px] flex flex-col">
              <CardHeader>
                <CardTitle>Chat Inteligente</CardTitle>
                <CardDescription>Haz preguntas sobre tu red WiFi</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.role === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-black dark:text-white"
                      }`}
                    >
                      <Streamdown>{msg.content}</Streamdown>
                    </div>
                  </div>
                ))}
                {isLoading && <Skeleton className="w-full h-12" />}
              </CardContent>
              <div className="border-t p-4 flex gap-2">
                <Input
                  placeholder="Pregunta sobre tu red WiFi..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  disabled={isLoading}
                />
                <Button onClick={handleSendMessage} disabled={isLoading}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* TAB: ANÁLISIS */}
          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Análisis Automático</CardTitle>
                <CardDescription>Evaluación completa del estado de tu red</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {wifiData ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Saturación General</p>
                      <p className="text-2xl font-bold">{Number(wifiData.saturacion_general)?.toFixed(1)}%</p>
                      <Badge variant={wifiData.saturacion_general > 80 ? "destructive" : "default"}>
                        {wifiData.saturacion_general > 80 ? "Crítica" : "Normal"}
                      </Badge>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Ocupación Espectral</p>
                      <p className="text-2xl font-bold">{wifiData.ocupacion_espectral?.toFixed(1)}%</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Pérdida de Paquetes</p>
                      <p className="text-2xl font-bold">{wifiData.perdida_paquetes?.toFixed(1)}%</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Redes Detectadas</p>
                      <p className="text-2xl font-bold">{wifiData.total_redes}</p>
                    </div>
                  </div>
                ) : (
                  <Skeleton className="w-full h-32" />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: REPORTE */}
          <TabsContent value="report" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Generar Reporte</CardTitle>
                <CardDescription>Descargar análisis en formato PDF</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Resumen del reporte..."
                  value={report}
                  onChange={(e) => setReport(e.target.value)}
                  rows={6}
                />
                <Button onClick={handleGenerateReport} className="w-full">
                  <FileDown className="w-4 h-4 mr-2" />
                  Descargar Reporte PDF
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: RECOMENDACIONES */}
          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recomendaciones Personalizadas</CardTitle>
                <CardDescription>Sugerencias basadas en análisis de tu red</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {wifiData && (
                  <>
                    {wifiData.saturacion_general > 80 && (
                      <div className="flex gap-3 p-3 border rounded-lg bg-red-50 dark:bg-red-900/20">
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm">Saturación Crítica</p>
                          <p className="text-xs text-muted-foreground">Considera cambiar a un canal menos saturado</p>
                        </div>
                      </div>
                    )}
                    {wifiData.perdida_paquetes > 20 && (
                      <div className="flex gap-3 p-3 border rounded-lg bg-orange-50 dark:bg-orange-900/20">
                        <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm">Pérdida de Paquetes Alta</p>
                          <p className="text-xs text-muted-foreground">Verifica la calidad de la señal y la interferencia</p>
                        </div>
                      </div>
                    )}
                    {wifiData.ocupacion_espectral > 75 && (
                      <div className="flex gap-3 p-3 border rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                        <Lightbulb className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-sm">Ocupación Espectral Alta</p>
                          <p className="text-xs text-muted-foreground">Hay mucha interferencia en el espectro</p>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-3 p-3 border rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <BarChart3 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-sm">Monitoreo Continuo</p>
                        <p className="text-xs text-muted-foreground">Revisa las tendencias históricas para detectar patrones</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
