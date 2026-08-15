import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Crown, RefreshCw, ShieldCheck, UserCog, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type Role = "user" | "admin";

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
  const updateRole = trpc.users.updateRole.useMutation();

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
