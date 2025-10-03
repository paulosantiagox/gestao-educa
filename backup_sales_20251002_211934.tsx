import { useState } from "react";
import { Plus, Search, Pencil, Trash2, Eye, Users, Download, FileSpreadsheet, Filter, X } from "lucide-react";
import * as XLSX from 'xlsx';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SaleForm } from "@/components/forms/SaleForm";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeSP } from "@/lib/date-utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSettings } from "@/contexts/SettingsContext";

const Sales = () => {
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSale, setEditingSale] = useState<any>(null);
  const [viewingSale, setViewingSale] = useState<any>(null);
  
  // Filtros
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>("all");
  const [filterPayerName, setFilterPayerName] = useState<string>("");
  const [filterStudentName, setFilterStudentName] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [filterMinValue, setFilterMinValue] = useState<string>("");
  const [filterMaxValue, setFilterMaxValue] = useState<string>("");
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);
  
  const queryClient = useQueryClient();

  const { data: allSales = [], isLoading } = useQuery({
    queryKey: ["sales", searchTerm],
    queryFn: async () => {
      const result = await api.getSales({ search: searchTerm });
      const list = result.ok ? (((result.data as any)?.sales) || []) : [];
      return [...list].sort((a: any, b: any) => new Date(b.created_at || b.sale_date).getTime() - new Date(a.created_at || a.sale_date).getTime());
    },
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const result = await api.getPaymentMethods();
      return result.ok ? (result.data || []) : [];
    },
  });

  // Aplicar filtros
  const filteredSales = allSales.filter((sale: any) => {
    // Filtro por nome do pagador
    if (filterPayerName.trim() !== "") {
      const payerName = (sale.payer_name || '').toLowerCase();
      if (!payerName.includes(filterPayerName.toLowerCase())) return false;
    }

    // Filtro por nome do aluno
    if (filterStudentName.trim() !== "") {
      const studentNames = (sale.student_names || '').toLowerCase();
      if (!studentNames.includes(filterStudentName.toLowerCase())) return false;
    }

    // Filtro por data de venda (intervalo)
    if (filterStartDate) {
      const saleDate = new Date(sale.sale_date || sale.created_at);
      const startDate = new Date(filterStartDate);
      if (saleDate < startDate) return false;
    }
    if (filterEndDate) {
      const saleDate = new Date(sale.sale_date || sale.created_at);
      const endDate = new Date(filterEndDate);
      endDate.setHours(23, 59, 59, 999); // Incluir o dia inteiro
      if (saleDate > endDate) return false;
    }

    // Filtro por valor
    if (filterMinValue !== "") {
      const minValue = parseFloat(filterMinValue);
      const totalAmount = parseFloat(sale.total_amount || 0);
      if (totalAmount < minValue) return false;
    }
    if (filterMaxValue !== "") {
      const maxValue = parseFloat(filterMaxValue);
      const totalAmount = parseFloat(sale.total_amount || 0);
      if (totalAmount > maxValue) return false;
    }

    // Filtro por status de pagamento
    if (filterStatus !== "all" && sale.payment_status !== filterStatus) return false;

    // Filtro por método de pagamento
    if (filterPaymentMethod !== "all" && sale.payment_method_id?.toString() !== filterPaymentMethod) return false;

    return true;
  });

  // Paginação
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, endIndex);

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterPaymentMethod("all");
    setFilterPayerName("");
    setFilterStudentName("");
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterMinValue("");
    setFilterMaxValue("");
    setCurrentPage(1);
  };

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

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleView = (sale: any) => {
    setViewingSale(sale);
  };

  const handleEdit = (sale: any) => {
    setEditingSale(sale);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingSale(null);
    setIsDialogOpen(true);
  };

  const exportToExcel = () => {
    const dataToExport = filteredSales.map((sale: any) => ({
      'Código': sale.sale_code,
      'Data da Venda': formatDateTimeSP(sale.sale_date || sale.created_at),
      'Pagador': sale.payer_name,
      'Email': sale.payer_email,
      'Telefone': sale.payer_phone,
      'Alunos': sale.student_names,
      'Valor Total': `R$ ${parseFloat(sale.total_amount || 0).toFixed(2)}`,
      'Status': sale.payment_status === 'paid' ? 'Pago' : 
               sale.payment_status === 'pending' ? 'Pendente' : 
               sale.payment_status === 'cancelled' ? 'Cancelado' : 'Desconhecido',
      'Método de Pagamento': sale.payment_method_name || 'N/A',
      'Observações': sale.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas");
    
    const fileName = `vendas_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast.success(`Arquivo ${fileName} exportado com sucesso!`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'pending':
        return 'Pendente';
      case 'cancelled':
        return 'Cancelado';
      default:
        return 'Desconhecido';
    }
  };

  const [showFilters, setShowFilters] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Carregando vendas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendas</h1>
          <p className="text-muted-foreground">
            Gerencie as vendas do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportToExcel}
            className="flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nova Venda
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lista de Vendas ({filteredSales.length} {filteredSales.length === 1 ? 'venda' : 'vendas'})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por código, pagador ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Método de Pagamento</label>
                <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os métodos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os métodos</SelectItem>
                    {paymentMethods.map((method: any) => (
                      <SelectItem key={method.id} value={method.id.toString()}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Nome do Pagador</label>
                <Input
                  placeholder="Filtrar por pagador..."
                  value={filterPayerName}
                  onChange={(e) => setFilterPayerName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Nome do Aluno</label>
                <Input
                  placeholder="Filtrar por aluno..."
                  value={filterStudentName}
                  onChange={(e) => setFilterStudentName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Data Inicial</label>
                <Input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Data Final</label>
                <Input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Valor Mínimo</label>
                <Input
                  type="number"
                  placeholder="R$ 0,00"
                  value={filterMinValue}
                  onChange={(e) => setFilterMinValue(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Valor Máximo</label>
                <Input
                  type="number"
                  placeholder="R$ 0,00"
                  value={filterMaxValue}
                  onChange={(e) => setFilterMaxValue(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Limpar Filtros
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Pagador</TableHead>
                  <TableHead>Alunos</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {filteredSales.length === 0 ? "Nenhuma venda encontrada" : "Nenhuma venda nesta página"}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSales.map((sale: any) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">
                        {sale.sale_code}
                      </TableCell>
                      <TableCell>
                        {formatDateTimeSP(sale.sale_date || sale.created_at)}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sale.payer_name}</div>
                          <div className="text-sm text-muted-foreground">{sale.payer_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="max-w-[200px] truncate">
                                {sale.student_names || 'Nenhum aluno'}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-[300px] whitespace-normal">
                                {sale.student_names || 'Nenhum aluno'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {sale.students_count > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {sale.students_count} {sale.students_count === 1 ? 'aluno' : 'alunos'}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          R$ {parseFloat(sale.total_amount || 0).toFixed(2)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(sale.payment_status)}>
                          {getStatusText(sale.payment_status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sale.payment_method_name || 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(sale)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(sale)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir a venda "{sale.sale_code}"? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(sale.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">Itens por página:</p>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[70px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="top">
                    {[10, 20, 30, 50, 100].map((pageSize) => (
                      <SelectItem key={pageSize} value={pageSize.toString()}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium">
                  Página {currentPage} de {totalPages} ({filteredSales.length} {filteredSales.length === 1 ? 'item' : 'itens'})
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para criar/editar venda */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSale ? "Editar Venda" : "Nova Venda"}
            </DialogTitle>
          </DialogHeader>
          <SaleForm
             initialData={editingSale}
             saleId={editingSale?.id}
             onSuccess={() => {
               setIsDialogOpen(false);
               setEditingSale(null);
               queryClient.invalidateQueries({ queryKey: ["sales"] });
             }}
           />
        </DialogContent>
      </Dialog>

      {/* Dialog para visualizar venda */}
      <Dialog open={!!viewingSale} onOpenChange={() => setViewingSale(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Venda</DialogTitle>
          </DialogHeader>
          {viewingSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Código</label>
                  <p className="text-sm">{viewingSale.sale_code}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Data da Venda</label>
                  <p className="text-sm">{formatDateTimeSP(viewingSale.sale_date || viewingSale.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Pagador</label>
                  <p className="text-sm">{viewingSale.payer_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-sm">{viewingSale.payer_email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Telefone</label>
                  <p className="text-sm">{viewingSale.payer_phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Valor Total</label>
                  <p className="text-sm font-medium">R$ {parseFloat(viewingSale.total_amount || 0).toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <Badge className={getStatusColor(viewingSale.payment_status)}>
                    {getStatusText(viewingSale.payment_status)}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Método de Pagamento</label>
                  <p className="text-sm">{viewingSale.payment_method_name || 'N/A'}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Alunos</label>
                <p className="text-sm">{viewingSale.student_names || 'Nenhum aluno'}</p>
              </div>
              
              {viewingSale.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Observações</label>
                  <p className="text-sm">{viewingSale.notes}</p>
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
