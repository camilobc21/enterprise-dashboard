import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { CircleAlert, CircleCheck, Laptop, Network, Radio, RefreshCw, ShieldCheck, ShieldQuestion, Wifi } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

const DEVICE_TYPES = [
  ["unknown", "Sin clasificar"], ["computer", "Computador"], ["phone", "Teléfono"],
  ["tablet", "Tableta"], ["iot", "IoT"], ["printer", "Impresora"],
  ["router", "Router"], ["camera", "Cámara"], ["server", "Servidor"],
] as const;

function maskMac(mac: string) {
  const parts = mac.split(":");
  return parts.length === 6 ? `${parts.slice(0, 2).join(":")}:••:••:${parts.slice(-2).join(":")}` : mac;
}

function formatLastSeen(value: Date | string) {
  return new Date(value).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

export default function NetworkDevices() {
  const { user, loading, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const devicesQuery = trpc.networkDevices.list.useQuery(undefined, { enabled: isAuthenticated });
  const summaryQuery = trpc.networkDevices.summary.useQuery(undefined, { enabled: isAuthenticated });
  const trustMutation = trpc.networkDevices.setTrusted.useMutation();
  const arpRefreshMutation = trpc.networkDevices.refreshLocalArp.useMutation();

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
  }, [loading, isAuthenticated]);

  const refreshData = async () => {
    await Promise.all([utils.networkDevices.list.invalidate(), utils.networkDevices.summary.invalidate()]);
  };

  const refreshDevices = async () => {
    try {
      const result = await arpRefreshMutation.mutateAsync();
      await refreshData();
      toast.success(result.detected > 0 ? `${result.detected} dispositivo(s) detectado(s).` : "No se detectaron equipos en la caché ARP actual.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible consultar la red local.");
    }
  };

  const setTrusted = async (id: number, isTrusted: boolean) => {
    try {
      await trustMutation.mutateAsync({ id, isTrusted });
      await refreshData();
      toast.success(isTrusted ? "Dispositivo marcado como autorizado." : "Dispositivo marcado para revisión.");
    } catch {
      toast.error("No fue posible actualizar el estado de confianza.");
    }
  };

  if (loading) return <DashboardLayout><div className="space-y-5"><Skeleton className="h-28 w-full" /><Skeleton className="h-72 w-full" /></div></DashboardLayout>;

  const summary = summaryQuery.data ?? { total: 0, online: 0, untrusted: 0 };
  const isAdmin = user?.role === "admin";

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-blue-400"><Network className="h-5 w-5" /><span className="text-sm font-semibold uppercase tracking-wider">Detección local autorizada</span></div>
            <h1 className="text-3xl font-bold tracking-tight">Dispositivos conectados</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">Consulta el inventario compartido de equipos observados en tu red privada. Solo los administradores pueden iniciar una nueva actualización local.</p>
          </div>
          {isAdmin && <Button className="gap-2" onClick={refreshDevices} disabled={arpRefreshMutation.isPending}><RefreshCw className={`h-4 w-4 ${arpRefreshMutation.isPending ? "animate-spin" : ""}`} />{arpRefreshMutation.isPending ? "Detectando…" : "Actualizar dispositivos"}</Button>}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardDescription>Detectados</CardDescription><CardTitle className="text-3xl">{summary.total}</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2 text-sm text-muted-foreground"><Laptop className="h-4 w-4" />Equipos reportados al proyecto</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>En línea</CardDescription><CardTitle className="text-3xl text-emerald-500">{summary.online}</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2 text-sm text-muted-foreground"><Wifi className="h-4 w-4" />Última observación local</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Por revisar</CardDescription><CardTitle className="text-3xl text-amber-500">{summary.untrusted}</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldQuestion className="h-4 w-4" />Sin marcar como autorizados</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Equipos detectados en la red</CardTitle><CardDescription>Inventario compartido del proyecto, basado en observaciones locales autorizadas. No explora redes externas.</CardDescription></CardHeader>
          <CardContent>
            {devicesQuery.isLoading ? <Skeleton className="h-64 w-full" /> : devicesQuery.data && devicesQuery.data.length > 0 ? (
              <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Dispositivo</TableHead><TableHead>Dirección</TableHead><TableHead>Tipo</TableHead><TableHead>Estado</TableHead><TableHead>Confianza</TableHead><TableHead>Última vez visto</TableHead>{isAdmin && <TableHead>Acción</TableHead>}</TableRow></TableHeader>
                <TableBody>{devicesQuery.data.map((device) => <TableRow key={device.id}><TableCell><p className="font-medium">{device.displayName}</p><p className="text-xs text-muted-foreground">Fuente: ARP local</p></TableCell><TableCell><p>{device.ipAddress || "Sin IP"}</p><p className="font-mono text-xs text-muted-foreground">{maskMac(device.macAddress)}</p></TableCell><TableCell><Badge variant="outline">{DEVICE_TYPES.find(([value]) => value === device.deviceType)?.[1] ?? "Sin clasificar"}</Badge></TableCell><TableCell><Badge variant={device.status === "online" ? "default" : "secondary"} className={device.status === "online" ? "bg-emerald-600 hover:bg-emerald-600" : ""}>{device.status === "online" ? <CircleCheck className="mr-1 h-3 w-3" /> : <CircleAlert className="mr-1 h-3 w-3" />}{device.status === "online" ? "En línea" : device.status === "offline" ? "Fuera de línea" : "Sin confirmar"}</Badge></TableCell><TableCell>{device.isTrusted ? <Badge className="bg-blue-600 hover:bg-blue-600"><ShieldCheck className="mr-1 h-3 w-3" />Autorizado</Badge> : <Badge variant="secondary">Por revisar</Badge>}</TableCell><TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatLastSeen(device.lastSeen)}</TableCell>{isAdmin && <TableCell><Button variant="outline" size="sm" disabled={trustMutation.isPending} onClick={() => setTrusted(device.id, !device.isTrusted)}>{device.isTrusted ? "Revisar" : "Autorizar"}</Button></TableCell>}</TableRow>)}</TableBody>
              </Table></div>
            ) : <div className="py-14 text-center"><Radio className="mx-auto mb-4 h-11 w-11 text-muted-foreground" /><p className="font-medium">No hay dispositivos detectados todavía.</p><p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">Un administrador debe pulsar “Actualizar dispositivos” desde el computador que ejecuta el dashboard para registrar observaciones de la red local.</p></div>}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
