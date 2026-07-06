import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Tag } from "lucide-react";

export default function CRUDManager() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const recordsQuery = trpc.crud.getRecords.useQuery({ limit: 50, offset: 0 });
  const createMutation = trpc.crud.create.useMutation();
  const updateMutation = trpc.crud.update.useMutation();
  const deleteMutation = trpc.crud.delete.useMutation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [recordType, setRecordType] = useState("Proyecto");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("El título es requerido");
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          title,
          description,
          priority,
          tags,
        });
        toast.success("Registro actualizado");
      } else {
        await createMutation.mutateAsync({
          recordType,
          title,
          description,
          data: { createdBy: user?.id },
          priority,
          tags,
        });
        toast.success("Registro creado");
      }
      recordsQuery.refetch();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Error al guardar el registro");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este registro?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast.success("Registro eliminado");
        recordsQuery.refetch();
      } catch (error) {
        toast.error("Error al eliminar el registro");
      }
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setRecordType("Proyecto");
    setTitle("");
    setDescription("");
    setPriority("medium");
    setTags([]);
    setTagInput("");
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestor de Registros</h1>
            <p className="text-muted-foreground mt-2">Crea, edita y gestiona tus registros personalizados</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => resetForm()}>
                <Plus className="h-4 w-4" />
                Nuevo Registro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Registro" : "Crear Nuevo Registro"}</DialogTitle>
                <DialogDescription>Completa los detalles del registro</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Tipo de Registro</label>
                  <Select value={recordType} onValueChange={setRecordType} disabled={!!editingId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Proyecto">Proyecto</SelectItem>
                      <SelectItem value="Tarea">Tarea</SelectItem>
                      <SelectItem value="Cliente">Cliente</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Título</label>
                  <Input
                    placeholder="Título del registro"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Descripción</label>
                  <Textarea
                    placeholder="Descripción detallada"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Prioridad</label>
                  <Select value={priority} onValueChange={(val) => setPriority(val as "low" | "medium" | "high")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium">Etiquetas</label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Agregar etiqueta"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
                    />
                    <Button onClick={handleAddTag} variant="outline">
                      Agregar
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button onClick={handleSave} className="w-full" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? "Actualizar" : "Crear"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Registros</CardTitle>
            <CardDescription>Lista de todos tus registros</CardDescription>
          </CardHeader>
          <CardContent>
            {recordsQuery.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : recordsQuery.data && recordsQuery.data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Etiquetas</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recordsQuery.data.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{record.recordType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.priority === "high"
                              ? "destructive"
                              : record.priority === "medium"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {record.priority === "high" ? "Alta" : record.priority === "medium" ? "Media" : "Baja"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {Array.isArray(record.tags) &&
                            record.tags.map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(record.createdAt).toLocaleDateString("es-ES")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingId(record.id);
                              setTitle(record.title);
                              setDescription(record.description || "");
                              setPriority(record.priority as "low" | "medium" | "high");
                              setTags(Array.isArray(record.tags) ? record.tags : []);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(record.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No hay registros. Crea uno para comenzar.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
