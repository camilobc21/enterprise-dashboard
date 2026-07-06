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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Download, Trash2, FileText, Lock, Unlock } from "lucide-react";

export default function DocumentManager() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const documentsQuery = trpc.documents.getDocuments.useQuery({ limit: 50, offset: 0 });
  const uploadMutation = trpc.documents.upload.useMutation();
  const deleteMutation = trpc.documents.delete.useMutation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [loading, isAuthenticated]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error("El archivo es demasiado grande (máximo 50MB)");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Selecciona un archivo");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        await uploadMutation.mutateAsync({
          fileName: selectedFile.name,
          fileData: base64,
          mimeType: selectedFile.type,
          fileSize: selectedFile.size,
          description: fileDescription,
          isPublic,
        });
        toast.success("Archivo subido correctamente");
        documentsQuery.refetch();
        setIsDialogOpen(false);
        setSelectedFile(null);
        setFileDescription("");
        setIsPublic(false);
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      toast.error("Error al subir el archivo");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("¿Estás seguro de que deseas eliminar este documento?")) {
      try {
        await deleteMutation.mutateAsync({ id });
        toast.success("Documento eliminado");
        documentsQuery.refetch();
      } catch (error) {
        toast.error("Error al eliminar el documento");
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
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
            <h1 className="text-3xl font-bold tracking-tight">Gestor de Documentos</h1>
            <p className="text-muted-foreground mt-2">Sube, gestiona y descarga tus archivos</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                Subir Archivo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Subir Nuevo Documento</DialogTitle>
                <DialogDescription>Carga un archivo a tu almacenamiento</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Archivo</label>
                  <Input
                    type="file"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium">Descripción</label>
                  <Input
                    placeholder="Descripción del archivo"
                    value={fileDescription}
                    onChange={(e) => setFileDescription(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="public"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                  />
                  <label htmlFor="public" className="text-sm font-medium cursor-pointer">
                    Hacer público
                  </label>
                </div>

                <Button
                  onClick={handleUpload}
                  className="w-full"
                  disabled={uploadMutation.isPending || !selectedFile}
                >
                  {uploadMutation.isPending ? "Subiendo..." : "Subir"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tus Documentos</CardTitle>
            <CardDescription>Lista de todos tus archivos subidos</CardDescription>
          </CardHeader>
          <CardContent>
            {documentsQuery.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : documentsQuery.data && documentsQuery.data.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tamaño</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Privacidad</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documentsQuery.data.map((doc: any) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {doc.fileName}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatFileSize(doc.fileSize)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{doc.mimeType.split("/")[1]}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground line-clamp-2">
                        {doc.description || "Sin descripción"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={doc.isPublic ? "default" : "secondary"}>
                          {doc.isPublic ? (
                            <Unlock className="h-3 w-3 mr-1" />
                          ) : (
                            <Lock className="h-3 w-3 mr-1" />
                          )}
                          {doc.isPublic ? "Público" : "Privado"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(doc.createdAt).toLocaleDateString("es-ES")}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = doc.fileUrl;
                              link.download = doc.fileName;
                              link.click();
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(doc.id)}
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
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No hay documentos. Sube uno para comenzar.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
