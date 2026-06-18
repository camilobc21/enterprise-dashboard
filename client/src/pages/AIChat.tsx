import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { MessageSquare, Plus, Send, Zap, FileText, Lightbulb, Loader2, Radar, TrendingUp } from "lucide-react";
import { Streamdown } from "streamdown";

export default function AIChat() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  
  const conversationsQuery = trpc.ai.getConversations.useQuery();
  const createConversationMutation = trpc.ai.createConversation.useMutation();
  const sendMessageMutation = trpc.ai.sendMessage.useMutation();
  const analyzeWiFiMutation = trpc.ai.analyzeWiFiData.useMutation();
  const generateReportMutation = trpc.ai.generateReport.useMutation();
  const getRecommendationsMutation = trpc.ai.getRecommendations.useMutation();
  const analyzeInterferenceMutation = trpc.ai.analyzeInterference.useMutation();
  const predictAnomaliesMutation = trpc.ai.predictAnomalies.useMutation();

  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [conversationTitle, setConversationTitle] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [includeWiFiContext, setIncludeWiFiContext] = useState(true);
  const [analysisResult, setAnalysisResult] = useState("");
  const [reportResult, setReportResult] = useState("");
  const [recommendationsResult, setRecommendationsResult] = useState<any[]>([]);
  const [interferenceResult, setInterferenceResult] = useState("");
  const [predictionsResult, setPredictionsResult] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages();
    }
  }, [selectedConversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    if (!selectedConversationId) return;
    setIsLoadingMessages(true);
    try {
      const msgs = await trpc.ai.getMessages.useQuery({ conversationId: selectedConversationId }).refetch();
      setMessages(msgs.data || []);
    } catch (error) {
      toast.error("Error al cargar mensajes");
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleCreateConversation = async () => {
    try {
      const result = await createConversationMutation.mutateAsync({
        title: conversationTitle || "Nueva Conversación",
      });
      toast.success("Conversación creada");
      conversationsQuery.refetch();
      setConversationTitle("");
      setIsCreatingConversation(false);
      if (result && typeof result === "object" && "insertId" in result) {
        setSelectedConversationId(result.insertId as number);
      }
    } catch (error) {
      toast.error("Error al crear conversación");
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversationId) {
      toast.error("Escribe un mensaje y selecciona una conversación");
      return;
    }

    const userMessage = messageInput;
    setMessageInput("");
    setMessages([...messages, { role: "user", content: userMessage }]);
    setIsSendingMessage(true);

    try {
      const response = await sendMessageMutation.mutateAsync({
        conversationId: selectedConversationId,
        message: userMessage,
        includeWiFiContext,
      });

      setMessages((prev) => [...prev, { role: "assistant", content: response.assistantMessage }]);
      toast.success("Mensaje enviado");
    } catch (error) {
      toast.error("Error al enviar mensaje");
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleAnalyzeWiFi = async () => {
    try {
      const result = await analyzeWiFiMutation.mutateAsync();
      setAnalysisResult(result.analysis);
      toast.success("Análisis completado");
    } catch (error) {
      toast.error("Error al analizar WiFi");
    }
  };

  const handleGenerateReport = async () => {
    try {
      const result = await generateReportMutation.mutateAsync({ format: "markdown" });
      setReportResult(result.report);
      toast.success("Reporte generado");
    } catch (error) {
      toast.error("Error al generar reporte");
    }
  };

  const handleGetRecommendations = async () => {
    try {
      const result = await getRecommendationsMutation.mutateAsync();
      setRecommendationsResult(result.recommendations);
      toast.success("Recomendaciones obtenidas");
    } catch (error) {
      toast.error("Error al obtener recomendaciones");
    }
  };

  const handleAnalyzeInterference = async () => {
    try {
      const result = await analyzeInterferenceMutation.mutateAsync();
      setInterferenceResult(result.interference);
      toast.success("Análisis de interferencia completado");
    } catch (error) {
      toast.error("Error al analizar interferencia");
    }
  };

  const handlePredictAnomalies = async () => {
    try {
      const result = await predictAnomaliesMutation.mutateAsync();
      setPredictionsResult(result.predictions);
      toast.success("Predicciones generadas");
    } catch (error) {
      toast.error("Error al generar predicciones");
    }
  };

  if (loading) {
    return <DashboardLayout><Skeleton className="w-full h-screen" /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Asistente IA WiFi Pro</h1>
          <p className="text-muted-foreground">Chat inteligente con análisis espectral y predicciones</p>
        </div>

        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="chat">💬 Chat</TabsTrigger>
            <TabsTrigger value="analysis">🔍 Análisis</TabsTrigger>
            <TabsTrigger value="report">📄 Reporte</TabsTrigger>
            <TabsTrigger value="recommendations">💡 Recomendaciones</TabsTrigger>
            <TabsTrigger value="interference">📡 Interferencia</TabsTrigger>
            <TabsTrigger value="predictions">📈 Predicciones</TabsTrigger>
          </TabsList>

          {/* TAB: CHAT */}
          <TabsContent value="chat" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Conversaciones */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Conversaciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Dialog open={isCreatingConversation} onOpenChange={setIsCreatingConversation}>
                    <DialogTrigger asChild>
                      <Button className="w-full" size="sm">
                        <Plus className="w-4 h-4 mr-2" /> Nueva
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nueva Conversación</DialogTitle>
                      </DialogHeader>
                      <Input
                        placeholder="Título (opcional)"
                        value={conversationTitle}
                        onChange={(e) => setConversationTitle(e.target.value)}
                      />
                      <Button onClick={handleCreateConversation} className="w-full">
                        Crear
                      </Button>
                    </DialogContent>
                  </Dialog>

                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {conversationsQuery.data?.map((conv: any) => (
                        <Button
                          key={conv.id}
                          variant={selectedConversationId === conv.id ? "default" : "outline"}
                          className="w-full justify-start text-left"
                          onClick={() => setSelectedConversationId(conv.id)}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          <span className="truncate">{conv.title}</span>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Chat */}
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Chat</CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer" 
                      onClick={() => setIncludeWiFiContext(!includeWiFiContext)}
                    >
                      {includeWiFiContext ? "✓" : "✗"} Contexto WiFi
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea
                    ref={scrollRef}
                    className="h-[400px] border rounded-lg p-4 space-y-4"
                  >
                    {isLoadingMessages ? (
                      <Skeleton className="w-full h-20" />
                    ) : messages.length === 0 ? (
                      <p className="text-muted-foreground text-center">Selecciona una conversación para comenzar</p>
                    ) : (
                      messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              msg.role === "user"
                                ? "bg-blue-500 text-white"
                                : "bg-gray-200 text-black dark:bg-gray-700 dark:text-white"
                            }`}
                          >
                            <Streamdown>{msg.content}</Streamdown>
                          </div>
                        </div>
                      ))
                    )}
                  </ScrollArea>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Escribe tu pregunta sobre WiFi..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      disabled={isSendingMessage}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isSendingMessage || !selectedConversationId}
                    >
                      {isSendingMessage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB: ANÁLISIS */}
          <TabsContent value="analysis" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Análisis Automático de WiFi</CardTitle>
                <CardDescription>Análisis detallado del estado actual de tu red</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleAnalyzeWiFi} disabled={analyzeWiFiMutation.isPending} className="w-full">
                  {analyzeWiFiMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                  Analizar Ahora
                </Button>
                {analysisResult && (
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border max-h-[600px] overflow-y-auto">
                    <Streamdown>{analysisResult}</Streamdown>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: REPORTE */}
          <TabsContent value="report" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Generar Reporte Profesional</CardTitle>
                <CardDescription>Reporte completo del estado de tu red WiFi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleGenerateReport} disabled={generateReportMutation.isPending} className="w-full">
                  {generateReportMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                  Generar Reporte
                </Button>
                {reportResult && (
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border max-h-[600px] overflow-y-auto">
                    <Streamdown>{reportResult}</Streamdown>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: RECOMENDACIONES */}
          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recomendaciones de Optimización</CardTitle>
                <CardDescription>Sugerencias específicas basadas en tus datos WiFi</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleGetRecommendations} disabled={getRecommendationsMutation.isPending} className="w-full">
                  {getRecommendationsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lightbulb className="w-4 h-4 mr-2" />}
                  Obtener Recomendaciones
                </Button>
                {recommendationsResult.length > 0 && (
                  <div className="space-y-3">
                    {recommendationsResult.map((rec: any, idx: number) => (
                      <Card key={idx} className="border-l-4 border-l-blue-500">
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <h3 className="font-semibold">{rec.titulo}</h3>
                              <Badge variant="outline">{rec.prioridad}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{rec.descripcion}</p>
                            <div className="flex gap-2">
                              <Badge variant="secondary">Impacto: {rec.impacto_estimado}</Badge>
                            </div>
                            {rec.pasos && (
                              <div className="text-sm">
                                <p className="font-semibold">Pasos:</p>
                                <ol className="list-decimal list-inside space-y-1">
                                  {rec.pasos.map((paso: string, i: number) => (
                                    <li key={i}>{paso}</li>
                                  ))}
                                </ol>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: INTERFERENCIA */}
          <TabsContent value="interference" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Análisis de Interferencia Espectral</CardTitle>
                <CardDescription>Análisis detallado de solapamiento entre canales</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleAnalyzeInterference} disabled={analyzeInterferenceMutation.isPending} className="w-full">
                  {analyzeInterferenceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Radar className="w-4 h-4 mr-2" />}
                  Analizar Interferencia
                </Button>
                {interferenceResult && (
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border max-h-[600px] overflow-y-auto">
                    <Streamdown>{interferenceResult}</Streamdown>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: PREDICCIONES */}
          <TabsContent value="predictions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Predicción de Anomalías Futuras</CardTitle>
                <CardDescription>Predicciones basadas en tendencias históricas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handlePredictAnomalies} disabled={predictAnomaliesMutation.isPending} className="w-full">
                  {predictAnomaliesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                  Generar Predicciones
                </Button>
                {predictionsResult && (
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border max-h-[600px] overflow-y-auto">
                    <Streamdown>{predictionsResult}</Streamdown>
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
