import { useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertCircle, Radio, Wifi } from "lucide-react";

export default function WiFiAnalysis() {
  const { loading, isAuthenticated } = useAuth();
  const dashboardQuery = trpc.wifi.getDashboard.useQuery();
  const healthQuery = trpc.wifi.healthCheck.useQuery();

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
  }, [loading, isAuthenticated]);

  const channelData = useMemo(() => (dashboardQuery.data?.canales ?? []).map((channel: any) => ({
    canal: `Canal ${channel.canal}`,
    redesObservadas: Number(channel.cantidad_redes),
  })), [dashboardQuery.data?.canales]);

  if (loading || dashboardQuery.isLoading) {
    return <DashboardLayout><div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div></DashboardLayout>;
  }

  const latest = dashboardQuery.data?.ultimo_escaneo;
  const flaskAvailable = healthQuery.data?.connected === true;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight"><Wifi className="h-8 w-8" />Observaciones WiFi</h1>
          <p className="mt-2 text-muted-foreground">Datos visibles para el ESP32 y guardados en MySQL/XAMPP.</p>
        </div>

        {!flaskAvailable && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertDescription>Flask o MySQL no responden. Revisa <code>http://127.0.0.1:5000/api/health</code> en el PC donde ejecutas el proyecto.</AlertDescription></Alert>}

        {dashboardQuery.data?.sin_datos ? (
          <Card><CardHeader><CardTitle>Sin escaneos persistidos</CardTitle><CardDescription>El dashboard no genera datos de demostración.</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">Inicia MySQL/XAMPP, ejecuta Flask y configura el firmware con <code>http://IP_DEL_PC:5000/api/scan</code>. Cuando el monitor serial muestre HTTP 201, las redes observadas aparecerán aquí.</p></CardContent></Card>
        ) : <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Redes observadas</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{latest?.total_redes ?? "N/D"}</div><p className="text-xs text-muted-foreground">Conteo del último escaneo persistido</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Fecha del escaneo</CardTitle></CardHeader><CardContent><div className="text-lg font-bold">{latest?.timestamp ? new Date(latest.timestamp).toLocaleString() : "N/D"}</div><p className="text-xs text-muted-foreground">Marca temporal almacenada en UTC</p></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Métricas no medidas</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">N/D</div><p className="text-xs text-muted-foreground">Interferencia, ocupación, pérdida y predicciones requieren otra fuente</p></CardContent></Card>
          </div>

          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Radio className="h-5 w-5" />Redes observadas por canal</CardTitle><CardDescription>Conteo real de BSSID/SSID visibles durante el último escaneo; no representa ocupación espectral.</CardDescription></CardHeader><CardContent>{channelData.length ? <ResponsiveContainer width="100%" height={320}><BarChart data={channelData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="canal" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="redesObservadas" name="Redes observadas" fill="#2563eb" /></BarChart></ResponsiveContainer> : <div className="flex h-80 items-center justify-center text-muted-foreground">El último escaneo no reportó redes válidas.</div>}</CardContent></Card>
        </>}
      </div>
    </DashboardLayout>
  );
}
