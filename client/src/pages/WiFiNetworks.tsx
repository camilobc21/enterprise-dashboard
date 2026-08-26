import { getLoginUrl } from "@/const";
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Lock, Signal, Wifi } from "lucide-react";

function signalLabel(rssi: number | null | undefined) {
  if (rssi === null || rssi === undefined) return "N/D";
  return `${rssi} dBm`;
}

export default function WiFiNetworks() {
  const { user, loading, isAuthenticated } = useAuth();
  const dashboardQuery = trpc.wifi.getDashboard.useQuery();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
  }, [loading, isAuthenticated]);

  const networks = dashboardQuery.data?.redes ?? [];
  const filteredNetworks = useMemo(() => networks.filter((network: any) => (network.ssid || "").toLowerCase().includes(searchTerm.toLowerCase())), [networks, searchTerm]);
  const measuredRssi = networks.map((network: any) => Number(network.rssi)).filter((rssi: number) => Number.isFinite(rssi));
  const averageSignal = measuredRssi.length ? Math.round(measuredRssi.reduce((total: number, rssi: number) => total + rssi, 0) / measuredRssi.length) : null;
  const encryptedNetworks = networks.filter((network: any) => network.encriptacion && !["OPEN", "UNKNOWN"].includes(network.encriptacion)).length;
  const isAdmin = user?.role === "admin";

  if (loading || dashboardQuery.isLoading) return <DashboardLayout><div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div></DashboardLayout>;

  return <DashboardLayout><div className="space-y-8">
    <div><h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight"><Wifi className="h-8 w-8" />Redes WiFi observadas</h1><p className="mt-2 text-muted-foreground">Puntos de acceso visibles desde la ubicación del ESP32 durante el último escaneo persistido.</p></div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Redes observadas</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{networks.length}</div></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Cifrado reportado</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{encryptedNetworks}</div><p className="text-xs text-muted-foreground">No constituye una certificación de seguridad.</p></CardContent></Card>
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">RSSI promedio</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{averageSignal === null ? "N/D" : `${averageSignal} dBm`}</div><p className="text-xs text-muted-foreground">Promedio de valores RSSI recibidos.</p></CardContent></Card>
    </div>
    <Card><CardHeader><CardTitle>Filtrar observaciones</CardTitle></CardHeader><CardContent><Input placeholder="Buscar por SSID..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="max-w-md" /></CardContent></Card>
    <Card><CardHeader><CardTitle>Observaciones disponibles</CardTitle><CardDescription>{filteredNetworks.length} de {networks.length} redes del último escaneo.</CardDescription></CardHeader><CardContent>{filteredNetworks.length ? <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>SSID</TableHead>{isAdmin && <TableHead>BSSID</TableHead>}<TableHead>Canal</TableHead><TableHead>RSSI</TableHead><TableHead>Cifrado reportado</TableHead></TableRow></TableHeader><TableBody>{filteredNetworks.map((network: any, index: number) => <TableRow key={`${network.bssid || network.ssid || "hidden"}-${index}`}><TableCell className="font-medium">{network.ssid || "SSID oculto"}</TableCell>{isAdmin && <TableCell className="font-mono text-xs">{network.bssid || "N/D"}</TableCell>}<TableCell><Badge variant="outline">{network.canal ?? "N/D"}</Badge></TableCell><TableCell><span className="flex items-center gap-2"><Signal className="h-4 w-4" />{signalLabel(network.rssi)}</span></TableCell><TableCell><span className="flex items-center gap-2">{network.encriptacion !== "OPEN" && <Lock className="h-4 w-4" />}{network.encriptacion || "N/D"}</span></TableCell></TableRow>)}</TableBody></Table></div> : <div className="py-8 text-center text-muted-foreground">{searchTerm ? "No hay observaciones que coincidan con el SSID." : "No hay redes persistidas todavía."}</div>}</CardContent></Card>
  </div></DashboardLayout>;
}
