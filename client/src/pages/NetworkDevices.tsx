import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { CircleAlert, CircleCheck, Laptop, Network, Plus, Radio, ShieldCheck, ShieldQuestion, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const DEVICE_TYPES = [
  ["unknown", "Sin clasificar"],
  ["computer", "Computador"],
  ["phone", "Teléfono"],
  ["tablet", "Tableta"],
  ["iot", "IoT"],
  ["printer", "Impresora"],
  ["router", "Router"],
  ["camera", "Cámara"],
  ["server", "Servidor"],
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
  const upsertMutation = trpc.networkDevices.upsert.useMutation();
  const trustMutation = trpc.networkDevices.setTrusted.useMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    ipAddress: "",
    macAddress: "",
    vendor: "",
    deviceType: "unknown" as (typeof DEVICE_TYPES)[number][0],
    status: "online" as "online" | "offline" | "unknown",
    isTrusted: false,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
  }, [loading, isAuthenticated]);

  const refresh = async () => {
    await Promise.all([utils.networkDevices.list.invalidate(), utils.networkDevices.summary.invalidate()]);
  };

  const addDevice = async () => {
    try {
      await upsertMutation.mutateAsync({ ...form, source: "manual" });
      toast.success("Dispositivo registrado en el inventario.");
      setDialogOpen(false);
      setForm({ displayName: "", ipAddress: "", macAddress: "", vendor: "", deviceType: "unknown", status: "online", isTrusted: false });
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible registrar el dispositivo.");
    }
  };

  const setTrusted = async (id: number, isTrusted: boolean) => {
    try {
      await trustMutation.mutateAsync({ id, isTrusted });
      await refresh();
      toast.success(isTrusted ? "Dispositivo marcado como autorizado." : "Dispositivo marcado para revisión.");
    } catch {
      toast.error("No fue posible actualizar el estado de confianza.");
    }
  };

  if (loading) {
    return <DashboardLayout><div className="space-y-5"><Skeleton className="h-28 w-full" /><Skeleton className="h-72 w-full" /></div></DashboardLayout>;
  }

  const summary = summaryQuery.data ?? { total: 0, online: 0, untrusted: 0 };
  const isAdmin = user?.role === "admin";

  return (
    <DashboardLayout>
      <div className="space-y-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-blue-400"><Network className="h-5 w-5" /><span className="text-sm font-semibold uppercase tracking-wider">Inventario autorizado</span></div>
            <h1 className="text-3xl font-bold tracking-tight">Dispositivos conectados</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">Supervisa equipos de tu red autorizada, su estado y la última vez que fueron detectados.</p>
          </div>
          {isAdmin && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Registrar dispositivo</Button></DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader><DialogTitle>Registrar dispositivo autorizado</DialogTitle><DialogDescription>Ingresa datos obtenidos del router, DHCP/ARP o un recolector autorizado.</DialogDescription></DialogHeader>
                <div className="grid gap-4 py-2">
                  <Input placeholder="Nombre, por ejemplo: Impresora oficina" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input placeholder="IP, por ejemplo: 192.168.1.42" value={form.ipAddress} onChange={(event) => setForm({ ...form, ipAddress: event.target.value })} />
                    <Input placeholder="MAC, por ejemplo: AA:BB:CC:DD:EE:FF" value={form.macAddress} onChange={(event) => setForm({ ...form, macAddress: event.target.value })} />
                  </div>
                  <Input placeholder="Fabricante (opcional)" value={form.vendor} onChange={(event) => setForm({ ...form, vendor: event.target.value })} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <select aria-label="Tipo de dispositivo" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.deviceType} onChange={(event) => setForm({ ...form, deviceType: event.target.value as typeof form.deviceType })}>
                      {DEVICE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <select aria-label="Estado" className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as typeof form.status })}>
                      <option value="online">En línea</option><option value="offline">Fuera de línea</option><option value="unknown">Sin confirmar</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isTrusted} onChange={(event) => setForm({ ...form, isTrusted: event.target.checked })} />Equipo autorizado y conocido</label>
                  <Button disabled={upsertMutation.isPending || !form.displayName || !form.macAddress} onClick={addDevice}>{upsertMutation.isPending ? "Registrando…" : "Guardar dispositivo"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardDescription>Total inventariado</CardDescription><CardTitle className="text-3xl">{summary.total}</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2 text-sm text-muted-foreground"><Laptop className="h-4 w-4" />Equipos registrados</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>En línea</CardDescription><CardTitle className="text-3xl text-emerald-500">{summary.online}</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2 text-sm text-muted-foreground"><Wifi className="h-4 w-4" />Último estado reportado</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Por revisar</CardDescription><CardTitle className="text-3xl text-amber-500">{summary.untrusted}</CardTitle></CardHeader><CardContent><div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldQuestion className="h-4 w-4" />Sin marcar como autorizados</div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Inventario de red</CardTitle><CardDescription>Los registros se muestran únicamente para el usuario que los administra. No se generan datos de ejemplo.</CardDescription></CardHeader>
          <CardContent>
            {devicesQuery.isLoading ? <Skeleton className="h-64 w-full" /> : devicesQuery.data && devicesQuery.data.length > 0 ? (
              <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Dispositivo</TableHead><TableHead>Dirección</TableHead><TableHead>Tipo</TableHead><TableHead>Estado</TableHead><TableHead>Confianza</TableHead><TableHead>Última vez visto</TableHead>{isAdmin && <TableHead>Acción</TableHead>}</TableRow></TableHeader>
                <TableBody>{devicesQuery.data.map((device) => <TableRow key={device.id}><TableCell><p className="font-medium">{device.displayName}</p><p className="text-xs text-muted-foreground">{device.vendor || "Fabricante no identificado"}</p></TableCell><TableCell><p>{device.ipAddress || "Sin IP"}</p><p className="font-mono text-xs text-muted-foreground">{maskMac(device.macAddress)}</p></TableCell><TableCell><Badge variant="outline">{DEVICE_TYPES.find(([value]) => value === device.deviceType)?.[1] ?? "Sin clasificar"}</Badge></TableCell><TableCell><Badge variant={device.status === "online" ? "default" : "secondary"} className={device.status === "online" ? "bg-emerald-600 hover:bg-emerald-600" : ""}>{device.status === "online" ? <CircleCheck className="mr-1 h-3 w-3" /> : <CircleAlert className="mr-1 h-3 w-3" />}{device.status === "online" ? "En línea" : device.status === "offline" ? "Fuera de línea" : "Sin confirmar"}</Badge></TableCell><TableCell>{device.isTrusted ? <Badge className="bg-blue-600 hover:bg-blue-600"><ShieldCheck className="mr-1 h-3 w-3" />Autorizado</Badge> : <Badge variant="secondary">Por revisar</Badge>}</TableCell><TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatLastSeen(device.lastSeen)}</TableCell>{isAdmin && <TableCell><Button variant="outline" size="sm" disabled={trustMutation.isPending} onClick={() => setTrusted(device.id, !device.isTrusted)}>{device.isTrusted ? "Revisar" : "Autorizar"}</Button></TableCell>}</TableRow>)}</TableBody>
              </Table></div>
            ) : <div className="py-14 text-center"><Radio className="mx-auto mb-4 h-11 w-11 text-muted-foreground" /><p className="font-medium">Aún no hay dispositivos registrados.</p><p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">Como administrador, registra el primer equipo o conecta un recolector autorizado del router para empezar a construir el inventario.</p></div>}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
