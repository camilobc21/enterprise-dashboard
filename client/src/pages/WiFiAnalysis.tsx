import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useSocketContext } from "@/contexts/SocketContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { AlertCircle, Wifi, Signal, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function WiFiAnalysis() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { isConnected } = useSocketContext();

  // Consultas tRPC
  const dashboardQuery = trpc.wifi.getDashboard.useQuery(undefined, { enabled: true });
  const channelsQuery = trpc.wifi.getChannels.useQuery(undefined, { enabled: true });
  const alertsQuery = trpc.wifi.getAlerts.useQuery({ limit: 50 }, { enabled: true });
  const predictionQuery = trpc.wifi.getPrediction.useQuery(undefined, { enabled: true });

  const [chartData, setChartData] = useState<any[]>([]);
  const [radarData, setRadarData] = useState<any[]>([]);
  const [flaskConnected, setFlaskConnected] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  // Procesar datos de canales para gráficos
  useEffect(() => {
    if (channelsQuery.data && channelsQuery.data.length > 0) {
      const data = channelsQuery.data.map((canal: any) => ({
        canal: `Canal ${canal.canal}`,
        saturacion: canal.saturacion,
        ocupacion: canal.ocupacion_espectral,
        interferencia: canal.interferencia_adyacente,
        perdida: canal.perdida_paquetes,
        riesgo: canal.riesgo_anomalia,
      }));
      setChartData(data);

      // Datos para gráfico radar (primeros 6 canales)
      const radarCharts = data.slice(0, 6).map((d: any) => ({
        ...d,
        saturacion: Math.round(d.saturacion),
        ocupacion: Math.round(d.ocupacion),
      }));
      setRadarData(radarCharts);
    }
  }, [channelsQuery.data]);

  // Verificar conexión a Flask
  useEffect(() => {
    if (dashboardQuery.isError) {
      setFlaskConnected(false);
      toast.error("No se pudo conectar a la API Flask");
    } else if (dashboardQuery.data) {
      setFlaskConnected(true);
    }
  }, [dashboardQuery.isError, dashboardQuery.data]);

  if (loading || dashboardQuery.isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  const lastScan = dashboardQuery.data?.ultimo_escaneo;
  const alerts = alertsQuery.data || [];
  const prediction = predictionQuery.data;

  if (dashboardQuery.data?.sin_datos) {
    return (
      <DashboardLayout>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay datos disponibles. Espera a que el ESP8266 envíe el primer escaneo.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Wifi className="h-8 w-8" />
              Análisis WiFi IA Pro
            </h1>
            <p className="text-muted-foreground mt-2">
              Monitoreo de canales, interferencia espectral y predicciones de IA
            </p>
          </div>
          <div className="flex gap-2">
            {flaskConnected ? (
              <Badge className="bg-green-500">API Flask Conectada</Badge>
            ) : (
              <Badge className="bg-red-500">API Flask Desconectada</Badge>
            )}
            {isConnected && <Badge className="bg-blue-500">WebSocket En Vivo</Badge>}
          </div>
        </div>

        {/* Estado de Conexión */}
        {!flaskConnected && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No se puede conectar a la API Flask. Verifica que el servidor esté ejecutándose.
            </AlertDescription>
          </Alert>
        )}

        {/* Métricas Principales */}
        {lastScan && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Redes Detectadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lastScan.total_redes}</div>
                <p className="text-xs text-muted-foreground">Redes WiFi activas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Saturación General</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lastScan.saturacion_general}%</div>
                <p className="text-xs text-muted-foreground">Ocupación del espectro</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ocupación Espectral</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lastScan.ocupacion_espectral}%</div>
                <p className="text-xs text-muted-foreground">Interferencia detectada</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pérdida de Paquetes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lastScan.perdida_paquetes}%</div>
                <p className="text-xs text-muted-foreground">Calidad de conexión</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Saturación por Canal */}
          <Card>
            <CardHeader>
              <CardTitle>Saturación por Canal</CardTitle>
              <CardDescription>Distribución de redes por canal WiFi</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="canal" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="saturacion" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Sin datos disponibles
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Interferencia */}
          <Card>
            <CardHeader>
              <CardTitle>Interferencia Adyacente</CardTitle>
              <CardDescription>Nivel de interferencia por canal</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="canal" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="interferencia" stroke="#ef4444" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Sin datos disponibles
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gráfico Radar */}
        {radarData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Análisis Multidimensional de Canales</CardTitle>
              <CardDescription>Comparativa de métricas por canal</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="canal" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar name="Saturación" dataKey="saturacion" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                  <Radar name="Ocupación" dataKey="ocupacion" stroke="#ef4444" fill="#ef4444" fillOpacity={0.5} />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Predicción de IA */}
        {prediction && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Predicción de IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Canal Óptimo Predicho</p>
                  <p className="text-2xl font-bold">{prediction.canal_predicho}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Confianza</p>
                  <p className="text-2xl font-bold">{(prediction.confianza * 100).toFixed(0)}%</p>
                </div>
              </div>
              <p className="text-sm">{prediction.detalle}</p>
            </CardContent>
          </Card>
        )}

        {/* Alertas Recientes */}
        {alerts.length > 0 && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Alertas Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <Badge variant={alert.severidad === "ALTA" ? "destructive" : "secondary"}>
                      {alert.severidad}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{alert.tipo}</p>
                      <p className="text-xs text-muted-foreground">{alert.descripcion}</p>
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
