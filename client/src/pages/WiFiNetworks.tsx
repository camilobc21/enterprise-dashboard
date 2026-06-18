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
import { Wifi, Signal, Lock, Zap } from "lucide-react";

export default function WiFiNetworks() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const networksQuery = trpc.wifi.getNetworks.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredNetworks, setFilteredNetworks] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/");
    }
  }, [loading, isAuthenticated, navigate]);

  // Filtrar redes por SSID
  useEffect(() => {
    if (networksQuery.data) {
      const filtered = networksQuery.data.filter((net: any) =>
        net.ssid?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredNetworks(filtered);
    }
  }, [networksQuery.data, searchTerm]);

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
              <div className="text-2xl font-bold">{networksQuery.data?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Redes Encriptadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {networksQuery.data?.filter((n: any) => n.encriptacion !== "Abierta").length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Señal Promedio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {networksQuery.data && networksQuery.data.length > 0
                  ? Math.round(
                      networksQuery.data.reduce((sum: number, n: any) => sum + n.rssi, 0) /
                        networksQuery.data.length
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
              {filteredNetworks.length} de {networksQuery.data?.length || 0} redes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {networksQuery.isLoading ? (
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
                      <TableHead>Ancho Banda</TableHead>
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
                          <TableCell>{network.ancho_banda} MHz</TableCell>
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
            <CardDescription>Canales WiFi 2.4 GHz y su estado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((canal) => {
                const isNonOverlapping = [1, 6, 11].includes(canal);
                const redes = networksQuery.data?.filter((n: any) => n.canal === canal).length || 0;
                return (
                  <div
                    key={canal}
                    className={`p-3 rounded-lg border text-center ${
                      isNonOverlapping
                        ? "bg-green-50 border-green-200"
                        : "bg-yellow-50 border-yellow-200"
                    }`}
                  >
                    <p className="font-bold text-lg">{canal}</p>
                    <p className="text-xs text-muted-foreground">{redes} redes</p>
                    {isNonOverlapping && (
                      <Badge className="mt-1 bg-green-100 text-green-800 text-xs">
                        Óptimo
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
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
