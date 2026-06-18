import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, AlertTriangle, Zap } from "lucide-react";
import axios from "axios";

const FLASK_API_URL = import.meta.env.VITE_FLASK_API_URL || "https://wolverine-punctual-immorally.ngrok-free.dev";

export default function WiFiTrends() {
  const { user, loading, isAuthenticated } = useAuth();
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [channelTrends, setChannelTrends] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("24h");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = "/";
    }
  }, [loading, isAuthenticated]);

  useEffect(() => {
    loadTrendData();
  }, [timeRange]);

  const loadTrendData = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${FLASK_API_URL}/api/dashboard`, { timeout: 5000 });
      
      if (response.data && response.data.historico) {
        // Procesar datos históricos
        const processed = response.data.historico.map((h: any, idx: number) => ({
          timestamp: new Date(h.timestamp).toLocaleTimeString("es-ES"),
          saturacion: h.saturacion_general || 0,
          ocupacion: h.ocupacion_espectral || 0,
          perdida: h.perdida_paquetes || 0,
          redes: h.total_redes || 0,
          tendencia: h.tendencia_ia || 0,
        }));

        setHistoricalData(processed);

        // Procesar tendencias por canal
        if (response.data.canales) {
          const channelData = response.data.canales.map((c: any) => ({
            canal: `Canal ${c.canal}`,
            saturacion: c.saturacion || 0,
            ocupacion: c.ocupacion_espectral || 0,
            interferencia: c.interferencia_adyacente || 0,
            perdida: c.perdida_paquetes || 0,
            riesgo: c.riesgo_anomalia || 0,
          }));
          setChannelTrends(channelData);
        }
      }
    } catch (error) {
      console.error("Error cargando datos de tendencias:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return <DashboardLayout><Skeleton className="w-full h-screen" /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="w-8 h-8" />
            Tendencias Históricas WiFi
          </h1>
          <p className="text-muted-foreground">Análisis de evolución de métricas a lo largo del tiempo</p>
        </div>

        {/* Selector de rango de tiempo */}
        <div className="flex gap-2">
          {(["24h", "7d", "30d"] as const).map((range) => (
            <Badge
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              className="cursor-pointer px-3 py-1"
              onClick={() => setTimeRange(range)}
            >
              {range === "24h" ? "Últimas 24h" : range === "7d" ? "Últimos 7 días" : "Últimos 30 días"}
            </Badge>
          ))}
        </div>

        <Tabs defaultValue="saturacion" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="saturacion">Saturación</TabsTrigger>
            <TabsTrigger value="ocupacion">Ocupación</TabsTrigger>
            <TabsTrigger value="perdida">Pérdida</TabsTrigger>
            <TabsTrigger value="canales">Canales</TabsTrigger>
            <TabsTrigger value="alertas">Alertas</TabsTrigger>
          </TabsList>

          {/* TAB: SATURACIÓN */}
          <TabsContent value="saturacion" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Evolución de Saturación General</CardTitle>
                <CardDescription>Porcentaje de saturación a lo largo del tiempo</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="w-full h-[400px]" />
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={historicalData}>
                      <defs>
                        <linearGradient id="colorSaturacion" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Area
                        type="monotone"
                        dataKey="saturacion"
                        stroke="#ef4444"
                        fillOpacity={1}
                        fill="url(#colorSaturacion)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: OCUPACIÓN */}
          <TabsContent value="ocupacion" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Evolución de Ocupación Espectral</CardTitle>
                <CardDescription>Porcentaje de ocupación espectral considerando interferencia</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="w-full h-[400px]" />
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={historicalData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="ocupacion"
                        stroke="#3b82f6"
                        dot={false}
                        name="Ocupación Espectral"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: PÉRDIDA */}
          <TabsContent value="perdida" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Evolución de Pérdida de Paquetes</CardTitle>
                <CardDescription>Porcentaje de pérdida de paquetes medida por ping</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="w-full h-[400px]" />
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={historicalData}>
                      <defs>
                        <linearGradient id="colorPerdida" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="timestamp" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Area
                        type="monotone"
                        dataKey="perdida"
                        stroke="#f97316"
                        fillOpacity={1}
                        fill="url(#colorPerdida)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: CANALES */}
          <TabsContent value="canales" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Comparativa de Canales</CardTitle>
                <CardDescription>Saturación, ocupación e interferencia por canal</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="w-full h-[400px]" />
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={channelTrends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="canal" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend />
                      <Bar dataKey="saturacion" fill="#ef4444" name="Saturación" />
                      <Bar dataKey="ocupacion" fill="#3b82f6" name="Ocupación" />
                      <Bar dataKey="interferencia" fill="#f97316" name="Interferencia" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: ALERTAS */}
          <TabsContent value="alertas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Historial de Alertas</CardTitle>
                <CardDescription>Eventos críticos detectados en el período</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {historicalData.map((data, idx) => {
                  const alerts = [];
                  if (data.saturacion > 80) alerts.push("Saturación crítica");
                  if (data.perdida > 20) alerts.push("Pérdida alta");
                  if (data.ocupacion > 75) alerts.push("Ocupación crítica");

                  return alerts.length > 0 ? (
                    <div key={idx} className="flex items-start gap-3 p-3 border rounded-lg bg-red-50 dark:bg-red-900/20">
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm">{data.timestamp}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {alerts.map((alert, i) => (
                            <Badge key={i} variant="destructive" className="text-xs">
                              {alert}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null;
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Estadísticas Generales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Saturación Promedio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {historicalData.length > 0
                  ? (
                      historicalData.reduce((sum, d) => sum + d.saturacion, 0) / historicalData.length
                    ).toFixed(1)
                  : "0"}
                %
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Ocupación Promedio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {historicalData.length > 0
                  ? (
                      historicalData.reduce((sum, d) => sum + d.ocupacion, 0) / historicalData.length
                    ).toFixed(1)
                  : "0"}
                %
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pérdida Promedio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {historicalData.length > 0
                  ? (
                      historicalData.reduce((sum, d) => sum + d.perdida, 0) / historicalData.length
                    ).toFixed(1)
                  : "0"}
                %
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Redes Promedio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {historicalData.length > 0
                  ? (
                      historicalData.reduce((sum, d) => sum + d.redes, 0) / historicalData.length
                    ).toFixed(0)
                  : "0"}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
