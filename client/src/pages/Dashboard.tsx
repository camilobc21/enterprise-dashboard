import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useSocketContext } from "@/contexts/SocketContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Users, FileText, MessageSquare } from "lucide-react";

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

const mockData = [
  { name: "Ene", value: 400, users: 240 },
  { name: "Feb", value: 300, users: 221 },
  { name: "Mar", value: 200, users: 229 },
  { name: "Abr", value: 278, users: 200 },
  { name: "May", value: 189, users: 218 },
  { name: "Jun", value: 239, users: 250 },
];

const mockPieData = [
  { name: "Activos", value: 65 },
  { name: "Pendientes", value: 25 },
  { name: "Completados", value: 10 },
];

export default function Dashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { isConnected, on } = useSocketContext();
  const metricsQuery = trpc.dashboard.getMetrics.useQuery();
  const notificationsQuery = trpc.notifications.getUnread.useQuery();
  const [liveNotifications, setLiveNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  // Escuchar notificaciones en tiempo real
  useEffect(() => {
    const unsubscribe = on("notification:new", (notification: any) => {
      setLiveNotifications((prev) => [notification, ...prev].slice(0, 5));
    });
    return () => unsubscribe?.();
  }, [on]);

  // Actualizar datos iniciales
  useEffect(() => {
    if (notificationsQuery.data) {
      setLiveNotifications(notificationsQuery.data);
    }
  }, [notificationsQuery.data]);

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
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bienvenido, {user?.name || "Usuario"}</h1>
            <p className="text-muted-foreground mt-2">Resumen de actividad y métricas clave del sistema</p>
          </div>
          {isConnected && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              En Vivo
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-muted-foreground">+12% desde el mes pasado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documentos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">456</div>
              <p className="text-xs text-muted-foreground">+8% desde la semana pasada</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversaciones IA</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">89</div>
              <p className="text-xs text-muted-foreground">+5 hoy</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Crecimiento</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+23%</div>
              <p className="text-xs text-muted-foreground">Comparado al trimestre anterior</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Tendencia de Actividad</CardTitle>
              <CardDescription>Últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" name="Eventos" />
                  <Line type="monotone" dataKey="users" stroke="#10b981" name="Usuarios" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado de Tareas</CardTitle>
              <CardDescription>Distribución actual</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={mockPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {mockPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Comparativa Mensual</CardTitle>
            <CardDescription>Rendimiento por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3b82f6" name="Eventos" />
                <Bar dataKey="users" fill="#10b981" name="Usuarios" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {liveNotifications && liveNotifications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Notificaciones en Tiempo Real</CardTitle>
              <CardDescription>{isConnected ? "Conectado - Recibiendo actualizaciones en vivo" : "Desconectado"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {liveNotifications.slice(0, 5).map((notification) => (
                  <div key={notification.id} className="flex items-start gap-4 pb-4 border-b last:border-b-0">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      notification.type === "error" ? "bg-red-500" :
                      notification.type === "success" ? "bg-green-500" :
                      notification.type === "warning" ? "bg-yellow-500" :
                      "bg-blue-500"
                    }`} />
                    <div className="flex-1">
                      <p className="font-medium">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
