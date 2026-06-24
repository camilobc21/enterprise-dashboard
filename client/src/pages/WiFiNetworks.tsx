import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Wifi, Signal, Lock, Zap, AlertCircle, TrendingDown } from "lucide-react";

export default function WiFiNetworks() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const dashboardQuery = trpc.wifi.getDashboard.useQuery(undefined, { enabled: true });
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredNetworks, setFilteredNetworks] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  // Filtrar redes por SSID
  useEffect(() => {
    if (dashboardQuery.data?.canales) {
      const filtered = dashboardQuery.data.canales.filter((net: any) =>
        net.ssid?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredNetworks(filtered);
    }
  }, [dashboardQuery.data, searchTerm]);

  const getSignalStrength = (rssi: number) => {
    if (rssi >= -50) return { label: "Excelente", color: "text-green-500", bg: "bg-green-50" };
    if (rssi >= -60) return { label: "Muy Bueno", color: "text-emerald-500", bg: "bg-emerald-50" };
    if (rssi >= -70) return { label: "Bueno", color: "text-blue-500", bg: "bg-blue-50" };
    if (rssi >= -80) return { label: "Aceptable", color: "text-yellow-500", bg: "bg-yellow-50" };
    return { label: "Débil", color: "text-red-500", bg: "bg-red-50" };
  };

  const getChannelType = (canal: number) => {
    if ([1, 6, 11].includes(canal)) {
      return <Badge className="bg-green-100 text-green-800">No Solapado</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800">Solapado</Badge>;
  };

  const getChannelHealth = (saturacion: number, ocupacion: number, interferencia: number) => {
    const score = (saturacion * 0.4 + ocupacion * 0.3 + interferencia * 0.3);
    if (score < 30) return { label: "Excelente", color: "bg-green-100 border-green-300", textColor: "text-green-700" };
    if (score < 50) return { label: "Bueno", color: "bg-blue-100 border-blue-300", textColor: "text-blue-700" };
    if (score < 70) return { label: "Regular", color: "bg-yellow-100 border-yellow-300", textColor: "text-yellow-700" };
    return { label: "Congestionado", color: "bg-red-100 border-red-300", textColor: "text-red-700" };
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
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wifi className="h-8 w-8" />
            Redes WiFi Detectadas
          </h1>
          <p className="text-muted-foreground mt-2">
            Listado de todas las redes WiFi en el rango del dispositivo
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Redes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardQuery.data?.canales?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Redes Encriptadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardQuery.data?.canales?.filter((n: any) => n.encriptacion !== "Abierta").length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Señal Promedio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardQuery.data?.canales && dashboardQuery.data.canales.length > 0
                  ? Math.round(
                      dashboardQuery.data.canales.reduce((sum: number, n: any) => sum + n.rssi, 0) /
                        dashboardQuery.data.canales.length
                    )
                  : 0}{" "}
                dBm
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Búsqueda */}
        <Card>
          <CardHeader>
            <CardTitle>Filtrar Redes</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Buscar por nombre de red (SSID)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </CardContent>
        </Card>

        {/* Tabla de Redes */}
        <Card>
          <CardHeader>
            <CardTitle>Redes Disponibles</CardTitle>
            <CardDescription>
              {filteredNetworks.length} de {dashboardQuery.data?.canales?.length || 0} redes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardQuery.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : filteredNetworks.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SSID</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Señal (dBm)</TableHead>
                      <TableHead>Calidad</TableHead>
                      <TableHead>Encriptación</TableHead>
                      <TableHead>Tipo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNetworks.map((network: any, idx: number) => {
                      const signal = getSignalStrength(network.rssi);
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{network.ssid || "Oculta"}</TableCell>
                          <TableCell>{network.canal}</TableCell>
                          <TableCell>{network.rssi}</TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-2 px-2 py-1 rounded ${signal.bg}`}>
                              <Signal className={`h-4 w-4 ${signal.color}`} />
                              <span className={`text-sm font-medium ${signal.color}`}>{signal.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {network.encriptacion !== "Abierta" && (
                                <Lock className="h-4 w-4 text-green-500" />
                              )}
                              <span className="text-sm">{network.encriptacion || "N/A"}</span>
                            </div>
                          </TableCell>
                          <TableCell>{getChannelType(network.canal)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No se encontraron redes con ese nombre" : "Sin datos de redes disponibles"}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información de Canales */}
        <Card>
          <CardHeader>
            <CardTitle>Información de Canales</CardTitle>
            <CardDescription>Canales WiFi 2.4 GHz con datos en tiempo real</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardQuery.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : dashboardQuery.data?.canales && dashboardQuery.data.canales.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {dashboardQuery.data.canales.map((canalData: any) => {
                  const isNonOverlapping = [1, 6, 11].includes(canalData.canal);
                  const health = getChannelHealth(
                    canalData.saturacion || 0,
                    canalData.ocupacion_espectral || 0,
                    canalData.interferencia_adyacente || 0
                  );
                  const redes = canalData.cantidad_redes || 0;
                  const hasAnomaly = canalData.anomalia === 1;

                  return (
                    <div
                      key={canalData.canal}
                      className={`p-4 rounded-lg border-2 text-center transition-all ${
                        health.color
                      } ${hasAnomaly ? "ring-2 ring-red-500" : ""}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-lg">{canalData.canal}</p>
                        {hasAnomaly && <AlertCircle className="h-4 w-4 text-red-500" />}
                      </div>
                      <p className={`text-xs font-medium ${health.textColor}`}>{health.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{redes} redes</p>
                      <div className="mt-2 space-y-1 text-xs">
                        <p className="text-muted-foreground">Sat: {Math.round(canalData.saturacion || 0)}%</p>
                        <p className="text-muted-foreground">Ocup: {Math.round(canalData.ocupacion_espectral || 0)}%</p>
                      </div>
                      {isNonOverlapping && (
                        <Badge className="mt-2 bg-green-600 text-white text-xs">
                          Óptimo
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingDown className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Sin datos de canales disponibles</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recomendaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Recomendaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="text-green-500">✓</span>
                <span>Usa canales no solapados (1, 6, 11) para minimizar interferencia</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-500">✓</span>
                <span>Evita canales con muchas redes detectadas</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-500">✓</span>
                <span>Considera usar HT20 en lugar de HT40 en áreas congestionadas</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-500">✓</span>
                <span>Monitorea la pérdida de paquetes y ajusta según sea necesario</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
