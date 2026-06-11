import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, Plus, Send } from "lucide-react";
import { Streamdown } from "streamdown";

export default function AIChat() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const conversationsQuery = trpc.ai.getConversations.useQuery();
  const createConversationMutation = trpc.ai.createConversation.useMutation();
  const sendMessageMutation = trpc.ai.sendMessage.useMutation();

  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [conversationTitle, setConversationTitle] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
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

    try {
      const response = await sendMessageMutation.mutateAsync({
        conversationId: selectedConversationId,
        message: userMessage,
      });

      setMessages((prev) => [...prev, { role: "assistant", content: response.assistantMessage }]);
      toast.success("Mensaje enviado");
    } catch (error) {
      toast.error("Error al enviar mensaje");
      setMessages((prev) => prev.filter((msg) => msg.content !== userMessage));
      setMessageInput(userMessage);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Asistente IA</h1>
              <p className="text-muted-foreground mt-2">Chat inteligente con Claude API</p>
            </div>
          </div>

          <Dialog open={isCreatingConversation} onOpenChange={setIsCreatingConversation}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nueva Conversación
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nueva Conversación</DialogTitle>
                <DialogDescription>Dale un título a tu nueva conversación</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Título de la conversación"
                  value={conversationTitle}
                  onChange={(e) => setConversationTitle(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleCreateConversation()}
                />
                <Button
                  onClick={handleCreateConversation}
                  className="w-full"
                  disabled={createConversationMutation.isPending}
                >
                  {createConversationMutation.isPending ? "Creando..." : "Crear"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Conversaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {conversationsQuery.isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : conversationsQuery.data && conversationsQuery.data.length > 0 ? (
                    conversationsQuery.data.map((conv) => (
                      <Button
                        key={conv.id}
                        variant={selectedConversationId === conv.id ? "default" : "outline"}
                        className="w-full justify-start text-left"
                        onClick={() => setSelectedConversationId(conv.id)}
                      >
                        <span className="truncate">{conv.title || "Sin título"}</span>
                      </Button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No hay conversaciones</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Chat</CardTitle>
              <CardDescription>
                {selectedConversationId ? "Conversación activa" : "Selecciona una conversación"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col h-96">
              {isLoadingMessages ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <>
                  <ScrollArea className="flex-1 mb-4 pr-4" ref={scrollRef}>
                    <div className="space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Inicia una conversación</p>
                        </div>
                      ) : (
                        messages.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                msg.role === "user"
                                  ? "bg-blue-500 text-white"
                                  : "bg-slate-200 text-slate-900"
                              }`}
                            >
                              {msg.role === "assistant" ? (
                                <Streamdown>{msg.content}</Streamdown>
                              ) : (
                                <p>{msg.content}</p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Escribe tu mensaje..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      disabled={!selectedConversationId || sendMessageMutation.isPending}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!selectedConversationId || sendMessageMutation.isPending}
                      className="gap-2"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
