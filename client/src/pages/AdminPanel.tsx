import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, AlertCircle } from "lucide-react";

export default function AdminPanel() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const usersQuery = trpc.users.getAll.useQuery(undefined, { enabled: user?.role === "admin" });
  const auditLogsQuery = trpc.audit.getLogs.useQuery({ limit: 50, offset: 0 }, { enabled: user?.role === "admin" });
  const updateRoleMutation = trpc.users.updateRole.useMutation();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<"user" | "admin">("user");

  useEffect(() => {
    if (!loading && (!isAuthenticated || user?.role !== "admin")) {
      navigate("/");
    }
  }, [loading, isAuthenticated, user?.role, navigate]);

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

  const handleUpdateRole = async () => {
    if (!selectedUserId) {
      toast.error("Selecciona un usuario");
      return;
    }

    try {
      await updateRoleMutation.mutateAsync({
        userId: selectedUserId,
        role: selectedRole,
      });
      toast.success("Rol actualizado correctamente");
      usersQuery.refetch();
      setSelectedUserId(null);
    } catch (error) {
      toast.error("Error al actualizar el rol");
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Panel Administrativo</h1>
            <p className="text-muted-foreground mt-2">Gestiona usuarios, roles y auditoría del sistema</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gestión de Usuarios</CardTitle>
            <CardDescription>Administra roles y permisos de los usuarios</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {usersQuery.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                <div className="flex gap-2 mb-4">
                  <Select value={selectedUserId?.toString() || ""} onValueChange={(val) => setSelectedUserId(parseInt(val))}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Selecciona un usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {usersQuery.data?.map((u) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.name || u.email || `Usuario ${u.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val as "user" | "admin")}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuario</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button onClick={handleUpdateRole} disabled={updateRoleMutation.isPending}>
                    {updateRoleMutation.isPending ? "Actualizando..." : "Actualizar Rol"}
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Último acceso</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersQuery.data?.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name || "Sin nombre"}</TableCell>
                        <TableCell>{u.email || "Sin email"}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                            {u.role === "admin" ? "Administrador" : "Usuario"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(u.lastSignedIn).toLocaleDateString("es-ES")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Registro de Auditoría
            </CardTitle>
            <CardDescription>Historial de acciones del sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {auditLogsQuery.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Acción</TableHead>
                    <TableHead>Tipo de Entidad</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogsQuery.data?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.action}</TableCell>
                      <TableCell>{log.entityType}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.userId ? `Usuario ${log.userId}` : "Sistema"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.status === "success" ? "default" : "destructive"}>
                          {log.status === "success" ? "Éxito" : "Error"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString("es-ES")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
