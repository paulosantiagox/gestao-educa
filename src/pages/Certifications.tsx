import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CertifierForm } from "@/components/forms/CertifierForm";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

const Certifications = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCertifier, setEditingCertifier] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: certifiers = [], isLoading } = useQuery({
    queryKey: ["certifiers"],
    queryFn: async () => {
      const result = await api.getCertifiers();
      return result.ok ? (result.data || []) : [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteCertifier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certifiers"] });
      toast.success("Certificadora excluída com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir certificadora");
    },
  });

  const handleEdit = (certifier: any) => {
    setEditingCertifier(certifier);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCertifier(null);
    queryClient.invalidateQueries({ queryKey: ["certifiers"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Certificadoras</h1>
          <p className="text-muted-foreground">Gerencie as certificadoras parceiras</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingCertifier(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Certificadora
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingCertifier ? "Editar Certificadora" : "Nova Certificadora"}</DialogTitle>
            </DialogHeader>
            <CertifierForm
              onSuccess={handleCloseDialog}
              initialData={editingCertifier}
              certifierId={editingCertifier?.id}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Certificadoras Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : certifiers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhuma certificadora cadastrada</p>
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Primeira Certificadora
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certifiers.map((certifier: any) => (
                  <TableRow key={certifier.id}>
                    <TableCell className="font-medium">{certifier.name}</TableCell>
                    <TableCell>{certifier.contact_email || "-"}</TableCell>
                    <TableCell>{certifier.contact_phone || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={certifier.active ? "default" : "secondary"}>
                        {certifier.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(certifier)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a certificadora {certifier.name}? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(certifier.id)}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Certifications;
