import { useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function WiFiTrends() {
  const { loading, isAuthenticated } = useAuth();
  const historyQuery = trpc.wifi.getHistory.useQuery({ timeRange: "30d" });

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
  }, [loading, isAuthenticated]);

  const history = useMemo(() => (historyQuery.data ?? []).slice().reverse().map((scan: any) => ({
    id: scan.id,
    fecha: scan.timestamp ? new Date(scan.timestamp).toLocaleString() : "N/D",
    redesObservadas: scan.total_redes,
  })), [historyQuery.data]);
  const averageNetworks = history.length ? history.reduce((total, scan) => total + Number(scan.redesObservadas), 0) / history.length : null;

  if (loading || historyQuery.isLoading) return <DashboardLayout><Skeleton className="h-64 w-full" /></DashboardLayout>;

  return <DashboardLayout><div className="space-y-6">
    <div><h1 className="flex items-center gap-2 text-3xl font-bold"><TrendingUp className="h-8 w-8" />Historial de escaneos WiFi</h1><p className="mt-2 text-muted-foreground">Solo se representan los escaneos que están guardados en MySQL.</p></div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Escaneos disponibles</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{history.length}</div><p className="text-xs text-muted-foreground">Últimos registros recuperados</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Promedio de redes observadas</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{averageNetworks === null ? "N/D" : averageNetworks.toFixed(1)}</div><p className="text-xs text-muted-foreground">Promedio sobre escaneos persistidos</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Métricas no capturadas</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">N/D</div><p className="text-xs text-muted-foreground">Sin estimar interferencia, ocupación, pérdida ni predicciones</p></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Redes observadas por escaneo</CardTitle><CardDescription>Conteo registrado por el ESP32 en cada momento.</CardDescription></CardHeader><CardContent>{history.length ? <ResponsiveContainer width="100%" height={400}><BarChart data={history}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="fecha" hide={history.length > 8} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="redesObservadas" name="Redes observadas" fill="#2563eb" /></BarChart></ResponsiveContainer> : <div className="flex h-80 items-center justify-center text-muted-foreground">No hay escaneos persistidos todavía.</div>}</CardContent></Card>
  </div></DashboardLayout>;
}
