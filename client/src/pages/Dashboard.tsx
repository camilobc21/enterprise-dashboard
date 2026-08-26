import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useSocketContext } from "@/contexts/SocketContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AlertCircle, FileText, MessageSquare, ScanLine, Wifi } from "lucide-react";

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4"];

function displayNumber(value: number | null | undefined, suffix = "") {
  return value === null || value === undefined ? "N/D" : `${value}${suffix}`;
}

export default function Dashboard() {
  const { user, loading, isAuthenticated } = useAuth();
  const { isConnected, on } = useSocketContext();
  const wifiDashboardQuery = trpc.wifi.getDashboard.useQuery();
  const trendsQuery = trpc.wifi.getTrends.useQuery();
  const documentsQuery = trpc.documents.getDocuments.useQuery({ limit: 50, offset: 0 });
  const conversationsQuery = trpc.ai.getConversations.useQuery();
  const notificationsQuery = trpc.notifications.getUnread.useQuery();
  const [liveNotifications, setLiveNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
  }, [loading, isAuthenticated]);

  useEffect(() => {
    const unsubscribe = on("notification:new", (notification: any) => {
      setLiveNotifications((previous) => [notification, ...previous].slice(0, 5));
    });
    return () => unsubscribe?.();
  }, [on]);

  useEffect(() => {
    if (notificationsQuery.data) setLiveNotifications(notificationsQuery.data);
  }, [notificationsQuery.data]);

  const lastScan = wifiDashboardQuery.data?.ultimo_escaneo;
  const trendData = useMemo(() => (trendsQuery.data ?? []).slice().reverse().map((scan: any) => ({
    timestamp: scan.timestamp ? new Date(scan.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/D",
    redes: scan.total_redes,
  })), [trendsQuery.data]);
  const channelData = useMemo(() => (wifiDashboardQuery.data?.canales ?? [])
    .filter((channel: any) => Number(channel.cantidad_redes) > 0)
    .map((channel: any) => ({ name: `Canal ${channel.canal}`, value: Number(channel.cantidad_redes) })), [wifiDashboardQuery.data?.canales]);

  if (loading || wifiDashboardQuery.isLoading) {
    return <DashboardLayout><div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bienvenido, {user?.name || "Usuario"}</h1>
            <p className="text-muted-foreground mt-2">Resumen basado en datos persistidos de tu proyecto y escaneos ESP32.</p>
          </div>
          {isConnected && <div className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm text-green-700"><div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />Conectado</div>}
        </div>

        {wifiDashboardQuery.data?.sin_datos && <Alert><AlertCircle className="h-4 w-4" /><AlertDescription>Aún no hay escaneos reales guardados. Inicia Flask y envía un escaneo desde el ESP32 para poblar las métricas WiFi.</AlertDescription></Alert>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Redes observadas</CardTitle><Wifi className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{displayNumber(lastScan?.total_redes)}</div><p className="text-xs text-muted-foreground">En el último escaneo ESP32</p></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Último escaneo</CardTitle><ScanLine className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-lg font-bold">{lastScan?.timestamp ? new Date(lastScan.timestamp).toLocaleString() : "N/D"}</div><p className="text-xs text-muted-foreground">Fecha persistida en MySQL</p></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Documentos propios</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{documentsQuery.data?.length ?? "N/D"}</div><p className="text-xs text-muted-foreground">Registros visibles para tu cuenta</p></CardContent></Card>
          <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Conversaciones IA</CardTitle><MessageSquare className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{conversationsQuery.data?.length ?? "N/D"}</div><p className="text-xs text-muted-foreground">Conversaciones guardadas</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2"><CardHeader><CardTitle>Historial de escaneos</CardTitle><CardDescription>Conteo de redes detectadas por el ESP32 en cada registro persistido.</CardDescription></CardHeader><CardContent>{trendData.length ? <ResponsiveContainer width="100%" height={300}><LineChart data={trendData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="timestamp" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="redes" stroke="#3b82f6" name="Redes observadas" /></LineChart></ResponsiveContainer> : <div className="flex h-[300px] items-center justify-center text-muted-foreground">Sin escaneos reales todavía</div>}</CardContent></Card>
          <Card><CardHeader><CardTitle>Distribución por canal</CardTitle><CardDescription>Solo redes observadas en el último escaneo.</CardDescription></CardHeader><CardContent>{channelData.length ? <ResponsiveContainer width="100%" height={300}><PieChart><Pie data={channelData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} dataKey="value">{channelData.map((entry: { name: string; value: number }, index: number) => <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <div className="flex h-[300px] items-center justify-center text-muted-foreground">Sin canales observados</div>}</CardContent></Card>
        </div>

        <Card><CardHeader><CardTitle>Comparativa de escaneos</CardTitle><CardDescription>Conteo real de redes detectadas en los últimos registros.</CardDescription></CardHeader><CardContent>{trendData.length ? <ResponsiveContainer width="100%" height={300}><BarChart data={trendData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="timestamp" /><YAxis /><Tooltip /><Legend /><Bar dataKey="redes" fill="#3b82f6" name="Redes observadas" /></BarChart></ResponsiveContainer> : <div className="flex h-[300px] items-center justify-center text-muted-foreground">Sin datos para comparar</div>}</CardContent></Card>

        {liveNotifications.length > 0 && <Card><CardHeader><CardTitle>Notificaciones</CardTitle><CardDescription>{isConnected ? "Actualizaciones recibidas" : "Historial disponible"}</CardDescription></CardHeader><CardContent><div className="space-y-4">{liveNotifications.slice(0, 5).map((notification) => <div key={notification.id} className="flex items-start gap-4 border-b pb-4 last:border-b-0"><div className={`mt-2 h-2 w-2 rounded-full ${notification.type === "error" ? "bg-red-500" : notification.type === "success" ? "bg-green-500" : notification.type === "warning" ? "bg-yellow-500" : "bg-blue-500"}`} /><div className="flex-1"><p className="font-medium">{notification.title}</p><p className="text-sm text-muted-foreground">{notification.message}</p></div></div>)}</div></CardContent></Card>}
      </div>
    </DashboardLayout>
  );
}
