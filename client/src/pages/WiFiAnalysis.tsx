import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useSocketContext } from "@/contexts/SocketContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { AlertCircle, Wifi, Signal, TrendingUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
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
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

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
        <div className="space-y-6">
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
          </div>

          {/* Onboarding Message */}
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-900">
                <Wifi className="h-5 w-5" />
                Bienvenido a WiFi Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <p className="text-sm text-gray-700 leading-relaxed">
                  WiFi Analysis es una plataforma de monitoreo avanzado que utiliza inteligencia artificial para analizar el espectro WiFi, detectar anomalías y predecir los mejores canales para tu red.
                </p>

                <div className="bg-white rounded-lg p-4 space-y-3 border border-blue-100">
                  <h3 className="font-semibold text-sm text-gray-900">Características principales:</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold mt-0.5">•</span>
                      <span><strong>Análisis Espectral:</strong> Monitoreo en tiempo real de saturación y ocupación del espectro WiFi</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold mt-0.5">•</span>
                      <span><strong>Detección de Interferencias:</strong> Identifica interferencias adyacentes y anomalías en los canales</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold mt-0.5">•</span>
                      <span><strong>Predicción IA:</strong> Recomendaciones inteligentes del canal óptimo basadas en patrones históricos</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold mt-0.5">•</span>
                      <span><strong>Alertas Automáticas:</strong> Notificaciones de anomalías y eventos críticos</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 space-y-3 border border-amber-100">
                <h3 className="font-semibold text-sm text-gray-900">Configurar tu ESP32/ESP8266:</h3>
                <ol className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold min-w-fit">1.</span>
                    <span>Carga el firmware WiFi Analysis en tu ESP32 o ESP8266</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold min-w-fit">2.</span>
                    <span>Configura la URL del backend: <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono break-all">{window.location.origin}/api/trpc/wifi.submitData</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold min-w-fit">3.</span>
                    <span>Conecta el dispositivo a la red WiFi</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold min-w-fit">4.</span>
                    <span>Los datos aparecerán aquí automáticamente en tiempo real</span>
                  </li>
                </ol>
              </div>

              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-green-900">
                  <strong>💡 Tip:</strong> Una vez que el ESP32 envíe el primer escaneo, verás gráficos interactivos, análisis de canales, predicciones de IA y alertas de anomalías.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Estado de Conexión</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Backend API</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <Badge className="bg-green-500">Conectado</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">ESP32/ESP8266</span>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">Esperando conexión...</Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">WebSocket en Vivo</span>
                  <div className="flex items-center gap-2">
                    {isConnected ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-blue-500" />
                        <Badge className="bg-blue-500">Conectado</Badge>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-gray-400" />
                        <Badge variant="outline" className="bg-gray-50 text-gray-800 border-gray-200">Desconectado</Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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
