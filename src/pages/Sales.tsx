import { useState } from "react";
import { Plus, Search, Pencil, Trash2, Eye } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SaleForm } from "@/components/forms/SaleForm";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";

const Sales = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [viewingSale, setViewingSale] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["sales", searchTerm],
    queryFn: async () => {
      const result = await api.getSales({ search: searchTerm });
      return result.ok ? ((result.data as any)?.sales || []) : [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteSale(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Venda excluída com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir venda");
    },
  });

  const handleEdit = async (sale: any) => {
    // Buscar detalhes completos da venda incluindo alunos
    const result = await api.getSale(sale.id);
    if (result.ok && result.data) {
      const saleData = result.data as any;
      setEditingSale({
        ...saleData,
        total_amount: saleData.total_amount?.toString() || "",
        paid_amount: saleData.paid_amount?.toString() || "0",
        payment_method_id: saleData.payment_method_id?.toString() || "",
        sale_date: saleData.sale_date ? new Date(saleData.sale_date).toISOString().split('T')[0] : "",
      });
      setIsDialogOpen(true);
    }
  };

  const handleView = async (sale: any) => {
    const result = await api.getSale(sale.id);
    if (result.ok && result.data) {
      setViewingSale(result.data);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSale(null);
    queryClient.invalidateQueries({ queryKey: ["sales"] });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { label: "Pendente", variant: "secondary" },
      partial: { label: "Parcial", variant: "outline" },
      paid: { label: "Pago", variant: "default" },
      cancelled: { label: "Cancelado", variant: "destructive" },
    };
    const config = variants[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vendas</h1>
          <p className="text-muted-foreground">Gerencie as vendas e pagamentos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingSale(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Venda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSale ? "Editar Venda" : "Nova Venda"}</DialogTitle>
            </DialogHeader>
            <SaleForm
              onSuccess={handleCloseDialog}
              initialData={editingSale}
              saleId={editingSale?.id}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pesquisar Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, nome do pagador ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhuma venda encontrada</p>
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar Primeira Venda
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Pagador</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Valor Pago</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale: any) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">{sale.sale_code}</TableCell>
                    <TableCell>{sale.payer_name}</TableCell>
                    <TableCell>{formatDate(sale.sale_date || sale.created_at)}</TableCell>
                    <TableCell>{formatCurrency(sale.total_amount)}</TableCell>
                    <TableCell>{formatCurrency(sale.paid_amount)}</TableCell>
                    <TableCell>{getStatusBadge(sale.payment_status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(sale)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(sale)}
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
                                Tem certeza que deseja excluir a venda {sale.sale_code}? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(sale.id)}
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

      {/* Dialog para visualizar detalhes da venda */}
      <Dialog open={!!viewingSale} onOpenChange={() => setViewingSale(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Venda</DialogTitle>
          </DialogHeader>
          {viewingSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Código</p>
                  <p className="font-medium">{viewingSale.sale_code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(viewingSale.payment_status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="font-medium">{formatCurrency(viewingSale.total_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Pago</p>
                  <p className="font-medium">{formatCurrency(viewingSale.paid_amount)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">Pagador</p>
                <div className="rounded-lg border p-4 space-y-2">
                  <p><strong>Nome:</strong> {viewingSale.payer_name}</p>
                  {viewingSale.payer_email && <p><strong>Email:</strong> {viewingSale.payer_email}</p>}
                  {viewingSale.payer_phone && <p><strong>Telefone:</strong> {viewingSale.payer_phone}</p>}
                  {viewingSale.payer_cpf && <p><strong>CPF:</strong> {viewingSale.payer_cpf}</p>}
                </div>
              </div>

              {viewingSale.students && viewingSale.students.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Alunos Associados</p>
                  <div className="rounded-lg border p-4">
                    {viewingSale.students.map((student: any) => (
                      <div key={student.student_id} className="py-2 border-b last:border-0">
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sales;
