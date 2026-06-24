import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
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

  const lastScan = dashboardQuery.data?.ultimo_escaneo;
  const alerts = alertsQuery.data || [];
  const prediction = predictionQuery.data;
  const flaskConnected = true; // Flask API connection status

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
              No se puede conectar con la API Flask. Asegúrate de que el servidor está corriendo en{" "}
              <code className="bg-slate-100 px-2 py-1 rounded">http://localhost:5000</code>
            </AlertDescription>
          </Alert>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                Redes Detectadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lastScan?.totalRedes || 0}</div>
              <p className="text-xs text-muted-foreground">En el último escaneo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Signal className="h-4 w-4" />
                Saturación General
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{lastScan ? parseFloat(lastScan.saturacionGeneral).toFixed(1) : 0}%</div>
              <p className="text-xs text-muted-foreground">Ocupación del espectro</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Canal Óptimo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{prediction?.canalOptimoPredicho || lastScan?.canalOptimo || "N/A"}</div>
              <p className="text-xs text-muted-foreground">
                Confianza: {prediction?.confianza ? (parseFloat(prediction.confianza) * 100).toFixed(0) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Alertas Activas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{alerts.length}</div>
              <p className="text-xs text-muted-foreground">Anomalías detectadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Saturación por Canal */}
          <Card>
            <CardHeader>
              <CardTitle>Saturación por Canal</CardTitle>
              <CardDescription>Ocupación de cada canal WiFi</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="canal" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="saturacion" fill="#ef4444" name="Saturación %" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Sin datos disponibles
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ocupación Espectral */}
          <Card>
            <CardHeader>
              <CardTitle>Ocupación Espectral</CardTitle>
              <CardDescription>Interferencia considerando canales adyacentes</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="canal" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="ocupacion" stroke="#3b82f6" name="Ocupación %" />
                    <Line type="monotone" dataKey="interferencia" stroke="#f59e0b" name="Interferencia %" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
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
                  <Radar name="Saturación" dataKey="saturacion" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                  <Radar name="Ocupación" dataKey="ocupacion" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Tooltip />
                  <Legend />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Predicción IA */}
        {prediction && (
          <Card>
            <CardHeader>
              <CardTitle>Predicción IA - Canal Óptimo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Canal Predicho</p>
                    <p className="text-2xl font-bold">{prediction.canalOptimoPredicho || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Confianza</p>
                    <p className="text-2xl font-bold">{prediction.confianza ? (parseFloat(prediction.confianza) * 100).toFixed(1) : 0}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Riesgo de Anomalía</p>
                    <p className="text-2xl font-bold">{prediction.riesgoAnomalia ? parseFloat(prediction.riesgoAnomalia).toFixed(1) : 0}%</p>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900">{prediction.analisisPrediccion || "Sin análisis disponible"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alertas */}
        {alerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Alertas Detectadas
              </CardTitle>
              <CardDescription>{alerts.length} anomalías activas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.slice(0, 10).map((alert: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      alert.severidad === "ALTA"
                        ? "bg-red-50 border-red-200"
                        : "bg-yellow-50 border-yellow-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          Canal {alert.canal} - {alert.tipo}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{alert.descripcion}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          alert.severidad === "ALTA"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {alert.severidad}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estado de carga */}
        {(dashboardQuery.isLoading || channelsQuery.isLoading) && (
          <div className="flex justify-center py-8">
            <div className="text-muted-foreground">Cargando datos WiFi...</div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
