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

const Sales = () => {
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

  // Calcular paginação
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const sales = filteredSales.slice(startIndex, endIndex);

  // Reset página quando filtros mudam
  const handleFilterChange = (filterFn: () => void) => {
    filterFn();
    setCurrentPage(1);
  };

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
    return formatDateTimeSP(date);
  };

  const exportToCSV = () => {
    if (filteredSales.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const headers = [
      "Código",
      "Pagador",
      "Email",
      "Telefone",
      "CPF",
      "Alunos",
      "Valor Total",
      "Valor Pago",
      "Status",
      "Método de Pagamento",
      "Data da Venda",
      "Data de Cadastro",
      "Observações"
    ];

    const csvRows = filteredSales.map((sale: any) => [
      `"${sale.sale_code || ''}"`,
      `"${sale.payer_name || ''}"`,
      `"${sale.payer_email || ''}"`,
      `"${sale.payer_phone || ''}"`,
      `"${sale.payer_cpf || ''}"`,
      `"${sale.student_names || '-'}"`,
      sale.total_amount || 0,
      sale.paid_amount || 0,
      `"${getStatusLabel(sale.payment_status)}"`,
      `"${sale.payment_method_name || '-'}"`,
      `"${formatDate(sale.sale_date || sale.created_at)}"`,
      `"${formatDate(sale.created_at)}"`,
      `"${(sale.notes || '').replace(/"/g, '""')}"` // Escape aspas
    ].join(","));

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `vendas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("CSV exportado com sucesso!");
  };

  const exportToExcel = () => {
    if (filteredSales.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const data = filteredSales.map((sale: any) => ({
      "Código": sale.sale_code || '',
      "Pagador": sale.payer_name || '',
      "Email": sale.payer_email || '',
      "Telefone": sale.payer_phone || '',
      "CPF": sale.payer_cpf || '',
      "Alunos": sale.student_names || '-',
      "Valor Total": sale.total_amount || 0,
      "Valor Pago": sale.paid_amount || 0,
      "Status": getStatusLabel(sale.payment_status),
      "Método de Pagamento": sale.payment_method_name || '-',
      "Data da Venda": formatDate(sale.sale_date || sale.created_at),
      "Data de Cadastro": formatDate(sale.created_at),
      "Observações": sale.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas");

    worksheet['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 15 },
      { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 40 }
    ];

    XLSX.writeFile(workbook, `vendas_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Excel exportado com sucesso!");
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      pending: "Pendente",
      partial: "Parcial",
      paid: "Pago",
      cancelled: "Cancelado"
    };
    return statusLabels[status] || status;
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
          <div className="flex items-center justify-between">
            <CardTitle>Filtros e Busca</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportToExcel}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, nome do pagador ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-2 block">Nome do Pagador</label>
              <Input
                placeholder="Filtrar por nome do pagador..."
                value={filterPayerName}
                onChange={(e) => {
                  setFilterPayerName(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Nome do Aluno</label>
              <Input
                placeholder="Filtrar por nome do aluno..."
                value={filterStudentName}
                onChange={(e) => {
                  setFilterStudentName(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Data Inicial</label>
              <Input
                type="date"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Data Final</label>
              <Input
                type="date"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Valor Mínimo</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={filterMinValue}
                onChange={(e) => {
                  setFilterMinValue(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Valor Máximo</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={filterMaxValue}
                onChange={(e) => {
                  setFilterMaxValue(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Status de Pagamento</label>
              <Select value={filterStatus} onValueChange={(value) => handleFilterChange(() => setFilterStatus(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="partial">Parcial</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Método de Pagamento</label>
              <Select value={filterPaymentMethod} onValueChange={(value) => handleFilterChange(() => setFilterPaymentMethod(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os métodos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {paymentMethods.map((method: any) => (
                    <SelectItem key={method.id} value={method.id.toString()}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Itens por página</label>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                setItemsPerPage(parseInt(value));
                setCurrentPage(1);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(filterStatus !== "all" || filterPaymentMethod !== "all" || 
            filterPayerName.trim() !== "" || filterStudentName.trim() !== "" ||
            filterStartDate !== "" || filterEndDate !== "" ||
            filterMinValue !== "" || filterMaxValue !== "") && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filtros ativos</span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpar filtros
              </Button>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Mostrando {sales.length} de {filteredSales.length} vendas
            {searchTerm && ` (filtradas de ${allSales.length} total)`}
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
                  <TableHead>Aluno(s)</TableHead>
                  <TableHead className="min-w-[140px]">Data/Hora</TableHead>
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
                    <TableCell>
                      {sale.students_count > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{sale.first_student_name}</span>
                          {sale.students_count > 1 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="cursor-help">
                                    +{sale.students_count - 1}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-semibold mb-1">Todos os alunos:</p>
                                  <p className="text-sm">{sale.student_names}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      ) : (
                        <Badge variant="secondary">
                          Sem alunos
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(sale.created_at)}</TableCell>
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex gap-2">
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
