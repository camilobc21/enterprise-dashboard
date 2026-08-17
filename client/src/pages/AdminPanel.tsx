import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { AI_PROVIDER_PROFILES, getAIProviderProfile } from "@shared/aiProviders";
import { Crown, KeyRound, Pencil, PlugZap, Power, RefreshCw, ShieldCheck, Trash2, UserCog, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type Role = "user" | "admin";
type SavedProvider = {
  id: number;
  configKey: string;
  providerName: string;
  baseUrl: string;
  model: string;
  isActive: boolean;
  updatedAt: Date | string;
};

function formatDate(value: Date | string | null) {
  if (!value) return "Sin acceso registrado";
  return new Date(value).toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function AdminPanel() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const [draftRoles, setDraftRoles] = useState<Record<number, Role>>({});
  const usersQuery = trpc.users.getAll.useQuery(undefined, {
    enabled: Boolean(isAuthenticated && user?.role === "admin"),
  });
  const providerStatusQuery = trpc.ai.getProviderStatus.useQuery(undefined, {
    enabled: Boolean(isAuthenticated && user?.role === "admin"),
  });
  const providerConfigsQuery = trpc.ai.listProviderConfigs.useQuery(undefined, {
    enabled: Boolean(isAuthenticated && user?.role === "admin"),
  });
  const updateRole = trpc.users.updateRole.useMutation();
  const saveProviderConfig = trpc.ai.saveProviderConfig.useMutation();
  const testProviderConnection = trpc.ai.testProviderConnection.useMutation();
  const activateProviderConfig = trpc.ai.activateProviderConfig.useMutation();
  const deleteProviderConfig = trpc.ai.deleteProviderConfig.useMutation();
  const [providerName, setProviderName] = useState("openai");
  const [customProviderName, setCustomProviderName] = useState("");
  const [providerBaseUrl, setProviderBaseUrl] = useState("https://api.openai.com/v1");
  const [providerModel, setProviderModel] = useState("gpt-4o-mini");
  const [providerApiKey, setProviderApiKey] = useState("");
  const [editingProvider, setEditingProvider] = useState<SavedProvider | null>(null);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login");
      return;
    }

    if (!loading && isAuthenticated && user?.role !== "admin") {
      toast.error("No tienes permisos para administrar roles.");
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate, user?.role]);

  const registeredUsers = usersQuery.data ?? [];
  const adminCount = useMemo(
    () => registeredUsers.filter((registeredUser) => registeredUser.role === "admin").length,
    [registeredUsers]
  );

  useEffect(() => {
    if (!providerStatusQuery.data?.configured) return;
    const profile = getAIProviderProfile(providerStatusQuery.data.providerName);
    setProviderName(profile.id);
    if (profile.id === "custom" && !["custom", "OpenAI Compatible"].includes(providerStatusQuery.data.providerName)) {
      setCustomProviderName(providerStatusQuery.data.providerName);
    }
    setProviderBaseUrl(providerStatusQuery.data.baseUrl);
    setProviderModel(providerStatusQuery.data.model);
  }, [providerStatusQuery.data]);

  const selectedProvider = getAIProviderProfile(providerName);

  function selectProvider(nextProviderId: string) {
    const nextProvider = getAIProviderProfile(nextProviderId);
    setProviderName(nextProvider.id);
    if (nextProvider.defaultBaseUrl) setProviderBaseUrl(nextProvider.defaultBaseUrl);
    if (nextProvider.defaultModel) setProviderModel(nextProvider.defaultModel);
    setEditingProvider(null);
  }

  function editProvider(provider: SavedProvider) {
    const profile = getAIProviderProfile(provider.providerName);
    setProviderName(profile.id);
    setCustomProviderName(profile.id === "custom" ? provider.providerName : "");
    setProviderBaseUrl(provider.baseUrl);
    setProviderModel(provider.model);
    setProviderApiKey("");
    setEditingProvider(provider);
  }

  function resetProviderForm() {
    const profile = getAIProviderProfile("openai");
    setProviderName(profile.id);
    setCustomProviderName("");
    setProviderBaseUrl(profile.defaultBaseUrl);
    setProviderModel(profile.defaultModel);
    setProviderApiKey("");
    setEditingProvider(null);
  }

  async function saveRole(userId: number, currentRole: Role) {
    const nextRole = draftRoles[userId] ?? currentRole;
    if (nextRole === currentRole) return;

    try {
      await updateRole.mutateAsync({ userId, role: nextRole });
      toast.success(nextRole === "admin" ? "Usuario promovido a administrador." : "Rol actualizado a usuario.");
      setDraftRoles((current) => {
        const { [userId]: _removed, ...remaining } = current;
        return remaining;
      });
      await Promise.all([
        utils.users.getAll.invalidate(),
        utils.users.getCurrentUser.invalidate(),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible actualizar el rol.");
    }
  }

  async function saveAIProvider() {
    if (!providerApiKey.trim() && !editingProvider) {
      toast.error("Pega la clave API antes de guardar un proveedor nuevo.");
      return;
    }

    try {
      await saveProviderConfig.mutateAsync({
        configKey: editingProvider?.configKey ?? providerName,
        providerName: providerName === "custom" ? (customProviderName.trim() || "OpenAI Compatible") : providerName,
        baseUrl: providerBaseUrl,
        model: providerModel,
        ...(providerApiKey.trim() ? { apiKey: providerApiKey } : {}),
      });
      resetProviderForm();
      await Promise.all([providerStatusQuery.refetch(), providerConfigsQuery.refetch()]);
      toast.success("Proveedor guardado y activado de forma segura.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la configuración de IA.");
    }
  }

  async function setActiveProvider(provider: SavedProvider) {
    try {
      await activateProviderConfig.mutateAsync({ id: provider.id });
      await Promise.all([providerStatusQuery.refetch(), providerConfigsQuery.refetch()]);
      toast.success(`${provider.providerName} ahora es el proveedor activo.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible activar el proveedor.");
    }
  }

  async function removeProvider(provider: SavedProvider) {
    if (!window.confirm(`¿Eliminar ${provider.providerName}? La clave cifrada asociada se eliminará de forma permanente.`)) return;
    try {
      await deleteProviderConfig.mutateAsync({ id: provider.id });
      if (editingProvider?.id === provider.id) resetProviderForm();
      await Promise.all([providerStatusQuery.refetch(), providerConfigsQuery.refetch()]);
      toast.success("Proveedor eliminado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible eliminar el proveedor.");
    }
  }

  async function testAIProvider() {
    try {
      const result = await testProviderConnection.mutateAsync();
      toast.success(`Conexión correcta. Respuesta: ${result.reply.slice(0, 80)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo conectar con el proveedor de IA.");
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") return null;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-7">
        <section className="flex flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-800 p-6 text-white shadow-sm md:flex-row md:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-400/15 px-3 py-1 text-xs font-semibold text-blue-100 ring-1 ring-blue-300/25">
              <ShieldCheck className="h-4 w-4" /> Acceso administrativo
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Gestión de roles</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Consulta las cuentas registradas y asigna el nivel de acceso adecuado para cada persona.
            </p>
          </div>
          <Button variant="outline" onClick={() => usersQuery.refetch()} disabled={usersQuery.isFetching} className="border-slate-500 bg-white/5 text-white hover:bg-white/10 hover:text-white">
            <RefreshCw className={`mr-2 h-4 w-4 ${usersQuery.isFetching ? "animate-spin" : ""}`} />
            Actualizar lista
          </Button>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3"><CardDescription>Usuarios registrados</CardDescription><CardTitle className="text-3xl">{registeredUsers.length}</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Cuentas creadas mediante correo y contraseña.</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardDescription>Administradores</CardDescription><CardTitle className="flex items-center gap-2 text-3xl"><Crown className="h-6 w-6 text-amber-500" />{adminCount}</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Al menos un administrador debe permanecer activo.</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3"><CardDescription>Tu rol actual</CardDescription><CardTitle className="flex items-center gap-2 text-2xl"><UserCog className="h-5 w-5 text-blue-600" />Administrador</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Puedes promover o degradar a otros usuarios.</CardContent>
          </Card>
        </section>

        <Card className="border-blue-200/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-blue-600" /> IA con tu propia clave</CardTitle>
            <CardDescription>
              Elige un proveedor conocido o configura un endpoint personalizado. OpenAI, Anthropic y Google Gemini usan sus formatos nativos; otros servicios usan el estándar compatible con OpenAI. La clave se cifra antes de guardarse y nunca vuelve a mostrarse.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={providerStatusQuery.data?.configured ? "default" : "secondary"}>
                {providerStatusQuery.data?.configured ? "Proveedor configurado" : "Pendiente de configurar"}
              </Badge>
              {providerStatusQuery.data?.configured ? <span className="text-muted-foreground">El chat usará {providerStatusQuery.data.providerName} · {providerStatusQuery.data.model}</span> : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="provider-name">Proveedor</Label>
                <Select value={providerName} onValueChange={selectProvider}>
                  <SelectTrigger id="provider-name"><SelectValue placeholder="Elige un proveedor" /></SelectTrigger>
                  <SelectContent>{AI_PROVIDER_PROFILES.map((profile) => <SelectItem key={profile.id} value={profile.id}>{profile.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider-model">Modelo</Label>
                <Input id="provider-model" value={providerModel} onChange={(event) => setProviderModel(event.target.value)} placeholder="gpt-4o-mini" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="provider-url">URL base del proveedor</Label>
                <Input id="provider-url" type="url" value={providerBaseUrl} onChange={(event) => setProviderBaseUrl(event.target.value)} placeholder={selectedProvider.defaultBaseUrl || "https://api.tu-proveedor.com/v1"} />
              </div>
              {providerName === "custom" ? <div className="space-y-2 md:col-span-2"><Label htmlFor="custom-provider-name">Nombre del proveedor personalizado</Label><Input id="custom-provider-name" value={customProviderName} onChange={(event) => setCustomProviderName(event.target.value)} placeholder="LM Studio, vLLM, Mistral u otro" /></div> : null}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="provider-key">Clave API</Label>
                <Input id="provider-key" type="password" autoComplete="off" value={providerApiKey} onChange={(event) => setProviderApiKey(event.target.value)} placeholder={providerStatusQuery.data?.configured ? "Introduce una nueva clave solo para reemplazar la actual" : "Pega tu clave API"} />
              </div>
            </div>
            <p className="rounded-lg bg-slate-50 p-3 text-sm text-muted-foreground dark:bg-slate-900/40"><strong className="text-foreground">{selectedProvider.label}:</strong> {selectedProvider.description}</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={saveAIProvider} disabled={saveProviderConfig.isPending}>
                <KeyRound className="mr-2 h-4 w-4" />{saveProviderConfig.isPending ? "Guardando…" : editingProvider ? "Guardar cambios y activar" : "Guardar clave y activar"}
              </Button>
              {editingProvider ? <Button variant="outline" onClick={resetProviderForm}>Cancelar edición</Button> : null}
              <Button variant="outline" onClick={testAIProvider} disabled={!providerStatusQuery.data?.configured || testProviderConnection.isPending}>
                <PlugZap className="mr-2 h-4 w-4" />{testProviderConnection.isPending ? "Probando…" : "Probar conexión"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PlugZap className="h-5 w-5 text-blue-600" /> Proveedores de IA guardados</CardTitle>
            <CardDescription>El proveedor activo atiende el chat. Puedes editar un perfil sin pegar de nuevo la clave, activarlo o eliminarlo junto con su clave cifrada.</CardDescription>
          </CardHeader>
          <CardContent>
            {providerConfigsQuery.isLoading ? <Skeleton className="h-32 w-full" /> : providerConfigsQuery.data?.length ? (
              <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Proveedor</TableHead><TableHead>Modelo</TableHead><TableHead>Estado</TableHead><TableHead>Actualizado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                <TableBody>{providerConfigsQuery.data.map((provider) => <TableRow key={provider.id}><TableCell><p className="font-medium">{provider.providerName}</p><p className="max-w-[230px] truncate text-xs text-muted-foreground">{provider.baseUrl}</p></TableCell><TableCell>{provider.model}</TableCell><TableCell>{provider.isActive ? <Badge>Activo</Badge> : <Badge variant="secondary">En espera</Badge>}</TableCell><TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(provider.updatedAt)}</TableCell><TableCell><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => editProvider(provider)}><Pencil className="mr-1 h-3.5 w-3.5" />Editar</Button><Button variant="outline" size="sm" disabled={provider.isActive || activateProviderConfig.isPending} onClick={() => setActiveProvider(provider)}><Power className="mr-1 h-3.5 w-3.5" />Activar</Button><Button variant="outline" size="sm" className="text-destructive hover:text-destructive" disabled={deleteProviderConfig.isPending} onClick={() => removeProvider(provider)}><Trash2 className="mr-1 h-3.5 w-3.5" />Eliminar</Button></div></TableCell></TableRow>)}</TableBody>
              </Table></div>
            ) : <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Aún no hay proveedores guardados. Configura uno arriba para que quede disponible en el chat.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><UsersRound className="h-5 w-5" /> Usuarios registrados</CardTitle>
              <CardDescription className="mt-1">Los cambios se aplican únicamente al confirmar cada fila.</CardDescription>
            </div>
            <Badge variant="secondary">{registeredUsers.length} cuenta{registeredUsers.length === 1 ? "" : "s"}</Badge>
          </CardHeader>
          <CardContent>
            {usersQuery.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : usersQuery.isError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
                No fue posible cargar los usuarios. Intenta actualizar la lista.
              </div>
            ) : registeredUsers.length === 0 ? (
              <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                Aún no hay usuarios registrados con correo y contraseña.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Rol actual</TableHead>
                      <TableHead>Último acceso</TableHead>
                      <TableHead className="min-w-[260px]">Nuevo rol</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registeredUsers.map((registeredUser) => {
                      const draftRole = draftRoles[registeredUser.id] ?? registeredUser.role;
                      const isCurrentUser = registeredUser.id === user.id;
                      const isSaving = updateRole.isPending && updateRole.variables?.userId === registeredUser.id;
                      const hasChange = draftRole !== registeredUser.role;

                      return (
                        <TableRow key={registeredUser.id}>
                          <TableCell>
                            <div className="font-medium text-foreground">{registeredUser.name || "Sin nombre"}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{registeredUser.email || "Sin correo"}{isCurrentUser ? " · Tú" : ""}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={registeredUser.role === "admin" ? "default" : "secondary"}>
                              {registeredUser.role === "admin" ? "Administrador" : "Usuario"}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(registeredUser.lastSignedIn)}</TableCell>
                          <TableCell>
                            <div className="flex min-w-[240px] items-center gap-2">
                              <Select value={draftRole} onValueChange={(value) => setDraftRoles((current) => ({ ...current, [registeredUser.id]: value as Role }))}>
                                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user" disabled={isCurrentUser && registeredUser.role === "admin"}>Usuario</SelectItem>
                                  <SelectItem value="admin">Administrador</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button size="sm" onClick={() => saveRole(registeredUser.id, registeredUser.role)} disabled={!hasChange || isSaving}>
                                {isSaving ? "Guardando…" : "Guardar"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
