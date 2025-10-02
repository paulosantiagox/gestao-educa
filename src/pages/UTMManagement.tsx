import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  Settings, 
  Link as LinkIcon,
  Copy,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { UTMForm } from "@/components/forms/UTMForm";

interface UTMConsultor {
  id: string;
  name: string;
  utm_code: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content?: string;
  utm_term?: string;
  active: boolean;
  sales_count: number;
  total_sales_value: number;
  created_at: string;
  updated_at: string;
}

export default function UTMManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingConsultor, setEditingConsultor] = useState<UTMConsultor | null>(null);
  const [deletingConsultor, setDeletingConsultor] = useState<UTMConsultor | null>(null);
  const queryClient = useQueryClient();

  // Buscar consultores UTM
  const { data: consultores = [], isLoading } = useQuery({
    queryKey: ["utm-consultores", searchTerm],
    queryFn: async () => {
      const response = await api.get(`/utm-consultores?search=${encodeURIComponent(searchTerm)}`);
      return response.data;
    },
  });

  // Criar consultor UTM
  const createMutation = useMutation({
    mutationFn: async (data: Omit<UTMConsultor, 'id' | 'sales_count' | 'total_sales_value' | 'created_at' | 'updated_at'>) => {
      const response = await api.post("/utm-consultores", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-consultores"] });
      setIsCreateDialogOpen(false);
      toast.success("Vendedora cadastrada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Erro ao cadastrar vendedora");
    },
  });

  // Atualizar consultor UTM
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<UTMConsultor> & { id: string }) => {
      const response = await api.put(`/utm-consultores/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-consultores"] });
      setEditingConsultor(null);
      toast.success("Vendedora atualizada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Erro ao atualizar vendedora");
    },
  });

  // Deletar consultor UTM
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/utm-consultores/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["utm-consultores"] });
      setDeletingConsultor(null);
      toast.success("Vendedora removida com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Erro ao remover vendedora");
    },
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const generateUTMLink = (consultor: UTMConsultor, baseUrl: string = "https://seusite.com") => {
    const params = new URLSearchParams();
    params.append('utm_source', consultor.utm_source);
    params.append('utm_medium', consultor.utm_medium);
    params.append('utm_campaign', consultor.utm_campaign);
    params.append('utm_content', consultor.utm_content || '');
    params.append('utm_term', consultor.utm_term || '');
    
    return `${baseUrl}?${params.toString()}`;
  };

  const copyUTMLink = (consultor: UTMConsultor) => {
    const link = generateUTMLink(consultor);
    navigator.clipboard.writeText(link);
    toast.success("Link UTM copiado para a área de transferência!");
  };

  const filteredConsultores = consultores.filter((consultor: UTMConsultor) =>
    consultor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    consultor.utm_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar UTM</h1>
          <p className="text-muted-foreground">
            Gerencie os códigos UTM das vendedoras e acompanhe o desempenho
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Nova Vendedora
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Cadastrar Nova Vendedora</DialogTitle>
              <DialogDescription>
                Configure os códigos UTM para uma nova vendedora
              </DialogDescription>
            </DialogHeader>
            <UTMForm
              onSubmit={(data) => createMutation.mutate(data)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nome ou código UTM..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Consultores */}
      <Card>
        <CardHeader>
          <CardTitle>Vendedoras Cadastradas ({filteredConsultores.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código UTM</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Medium</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Vendas</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredConsultores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Nenhuma vendedora encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConsultores.map((consultor: UTMConsultor) => (
                    <TableRow key={consultor.id}>
                      <TableCell className="font-medium">{consultor.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{consultor.utm_code}</Badge>
                      </TableCell>
                      <TableCell>{consultor.utm_source}</TableCell>
                      <TableCell>{consultor.utm_medium}</TableCell>
                      <TableCell>{consultor.utm_campaign}</TableCell>
                      <TableCell>{consultor.sales_count}</TableCell>
                      <TableCell>{formatCurrency(consultor.total_sales_value)}</TableCell>
                      <TableCell>
                        <Badge variant={consultor.active ? "default" : "secondary"}>
                          {consultor.active ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyUTMLink(consultor)}
                            title="Copiar link UTM"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingConsultor(consultor)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingConsultor(consultor)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Edição */}
      <Dialog open={!!editingConsultor} onOpenChange={() => setEditingConsultor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Vendedora</DialogTitle>
            <DialogDescription>
              Atualize os dados e códigos UTM da vendedora
            </DialogDescription>
          </DialogHeader>
          {editingConsultor && (
            <UTMForm
              initialData={editingConsultor}
              onSubmit={(data) => updateMutation.mutate({ id: editingConsultor.id, ...data })}
              isLoading={updateMutation.isPending}
              isEditing
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deletingConsultor} onOpenChange={() => setDeletingConsultor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a vendedora "{deletingConsultor?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingConsultor && deleteMutation.mutate(deletingConsultor.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}