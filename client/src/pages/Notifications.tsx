import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useSocketContext } from "@/contexts/SocketContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, Trash2, CheckCircle, AlertCircle, Info, Plus } from "lucide-react";

export default function Notifications() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { isConnected, on } = useSocketContext();
  const notificationsQuery = trpc.notifications.getNotifications.useQuery({ limit: 50, offset: 0 });
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation();
  const createNotificationMutation = trpc.notifications.create.useMutation();
  const [liveNotifications, setLiveNotifications] = useState<any[]>([]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "success" | "warning" | "error">("info");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  // Escuchar notificaciones en tiempo real
  useEffect(() => {
    const unsubscribe = on("notification:new", (notification: any) => {
      setLiveNotifications((prev) => [notification, ...prev]);
      notificationsQuery.refetch();
    });
    return () => unsubscribe?.();
  }, [on, notificationsQuery]);

  // Actualizar datos iniciales
  useEffect(() => {
    if (notificationsQuery.data) {
      setLiveNotifications(notificationsQuery.data);
    }
  }, [notificationsQuery.data]);

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markAsReadMutation.mutateAsync({ notificationId });
      notificationsQuery.refetch();
      toast.success("Notificación marcada como leída");
    } catch (error) {
      toast.error("Error al marcar como leída");
    }
  };

  const handleCreateNotification = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Completa todos los campos");
      return;
    }

    try {
      await createNotificationMutation.mutateAsync({
        title,
        message,
        type,
      });
      toast.success("Notificación creada");
      notificationsQuery.refetch();
      setTitle("");
      setMessage("");
      setType("info");
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Error al crear notificación");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
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
            <Bell className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
              <p className="text-muted-foreground mt-2">
                Gestiona todas tus notificaciones del sistema
                {isConnected && <Badge className="ml-2 bg-green-500">En Vivo</Badge>}
              </p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Nueva Notificación
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Notificación</DialogTitle>
                <DialogDescription>Crea una nueva notificación para ti</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Título</label>
                  <Input
                    placeholder="Título de la notificación"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Mensaje</label>
                  <Textarea
                    placeholder="Contenido del mensaje"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Tipo</label>
                  <Select value={type} onValueChange={(val) => setType(val as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Información</SelectItem>
                      <SelectItem value="success">Éxito</SelectItem>
                      <SelectItem value="warning">Advertencia</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleCreateNotification}
                  className="w-full"
                  disabled={createNotificationMutation.isPending}
                >
                  {createNotificationMutation.isPending ? "Creando..." : "Crear"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{notificationsQuery.data?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">No Leídas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {notificationsQuery.data?.filter((n: any) => !n.isRead).length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Leídas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {notificationsQuery.data?.filter((n: any) => n.isRead).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Todas las Notificaciones</CardTitle>
            <CardDescription>Historial completo de notificaciones</CardDescription>
          </CardHeader>
          <CardContent>
            {notificationsQuery.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : liveNotifications && liveNotifications.length > 0 ? (
              <div className="space-y-4">
                {liveNotifications.map((notification: any) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 rounded-lg border ${
                      notification.isRead ? "bg-slate-50 border-slate-200" : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="mt-1">{getIcon(notification.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold">{notification.title}</h3>
                        <Badge variant={notification.isRead ? "secondary" : "default"}>
                          {notification.isRead ? "Leída" : "Nueva"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString("es-ES")}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead(notification.id)}
                        disabled={markAsReadMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No hay notificaciones</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
