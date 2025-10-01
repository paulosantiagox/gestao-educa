import { useState } from "react";
import { Plus, Search, Pencil, Trash2, Download, FileSpreadsheet, Filter, X } from "lucide-react";
import * as XLSX from 'xlsx';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudentForm } from "@/components/forms/StudentForm";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatDateTimeSP } from "@/lib/date-utils";

const Students = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  
  // Filtros
  const [filterState, setFilterState] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [filterCPF, setFilterCPF] = useState<string>("");
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);
  
  const queryClient = useQueryClient();

  const { data: allStudents = [], isLoading } = useQuery({
    queryKey: ["students", searchTerm],
    queryFn: async () => {
      const result = await api.getStudents({ search: searchTerm });
      return result.ok ? ((result.data as any)?.students || []) : [];
    },
  });

  // Aplicar filtros
  const filteredStudents = allStudents.filter((student: any) => {
    // Filtro por CPF
    if (filterCPF.trim() !== "") {
      const cleanFilterCPF = filterCPF.replace(/\D/g, '');
      const cleanStudentCPF = (student.cpf || '').replace(/\D/g, '');
      if (!cleanStudentCPF.includes(cleanFilterCPF)) return false;
    }

    // Filtro por estado
    if (filterState !== "all") {
      if (!student.state || student.state.trim() === "") {
        if (filterState !== "empty") return false;
      } else {
        if (filterState === "empty") return false;
        if (student.state !== filterState) return false;
      }
    }

    // Filtro por ativo
    if (filterActive !== "all") {
      const isActive = student.active !== false;
      if (filterActive === "yes" && !isActive) return false;
      if (filterActive === "no" && isActive) return false;
    }

    return true;
  });

  // Calcular paginação
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const students = filteredStudents.slice(startIndex, endIndex);

  // Reset página quando filtros mudam
  const handleFilterChange = (filterFn: () => void) => {
    filterFn();
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilterState("all");
    setFilterActive("all");
    setFilterCPF("");
    setCurrentPage(1);
  };

  // Extrair estados únicos dos alunos
  const uniqueStates = Array.from(new Set(
    allStudents
      .map((s: any) => s.state)
      .filter((state: any) => state && state.trim() !== "")
  )).sort();

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Aluno excluído com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir aluno");
    },
  });

  const handleEdit = (student: any) => {
    setEditingStudent(student);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingStudent(null);
    queryClient.invalidateQueries({ queryKey: ["students"] });
  };

  const exportToCSV = () => {
    if (filteredStudents.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const headers = [
      "Nome",
      "Email",
      "CPF",
      "Telefone",
      "Data de Nascimento",
      "CEP",
      "Endereço",
      "Número",
      "Complemento",
      "Bairro",
      "Cidade",
      "Estado",
      "Link de Documentos",
      "Ativo",
      "Data de Cadastro"
    ];

    const csvRows = filteredStudents.map((student: any) => [
      `"${student.name || ''}"`,
      `"${student.email || ''}"`,
      `"${student.cpf || ''}"`,
      `"${student.phone || ''}"`,
      `"${student.birth_date ? formatDateTimeSP(student.birth_date) : ''}"`,
      `"${student.zip_code || ''}"`,
      `"${student.street || ''}"`,
      `"${student.number || ''}"`,
      `"${student.complement || ''}"`,
      `"${student.neighborhood || ''}"`,
      `"${student.city || ''}"`,
      `"${student.state || ''}"`,
      `"${student.documents_link || ''}"`,
      student.active !== false ? "Sim" : "Não",
      `"${formatDateTimeSP(student.created_at)}"`
    ].join(","));

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `alunos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("CSV exportado com sucesso!");
  };

  const exportToExcel = () => {
    if (filteredStudents.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const data = filteredStudents.map((student: any) => ({
      "Nome": student.name || '',
      "Email": student.email || '',
      "CPF": student.cpf || '',
      "Telefone": student.phone || '',
      "Data de Nascimento": student.birth_date ? formatDateTimeSP(student.birth_date) : '',
      "CEP": student.zip_code || '',
      "Endereço": student.street || '',
      "Número": student.number || '',
      "Complemento": student.complement || '',
      "Bairro": student.neighborhood || '',
      "Cidade": student.city || '',
      "Estado": student.state || '',
      "Link de Documentos": student.documents_link || '',
      "Ativo": student.active !== false ? "Sim" : "Não",
      "Data de Cadastro": formatDateTimeSP(student.created_at)
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Alunos");

    worksheet['!cols'] = [
      { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 10 }, { wch: 30 }, { wch: 8 },
      { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 5 },
      { wch: 30 }, { wch: 8 }, { wch: 18 }
    ];

    XLSX.writeFile(workbook, `alunos_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Excel exportado com sucesso!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Alunos</h1>
          <p className="text-muted-foreground">Gerencie os alunos da escola</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingStudent(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Aluno
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingStudent ? "Editar Aluno" : "Novo Aluno"}</DialogTitle>
            </DialogHeader>
            <StudentForm
              onSuccess={handleCloseDialog}
              initialData={editingStudent}
              studentId={editingStudent?.id}
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
              placeholder="Buscar por nome, email ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">CPF</label>
              <Input
                placeholder="Filtrar por CPF..."
                value={filterCPF}
                onChange={(e) => {
                  setFilterCPF(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Estado</label>
              <Select value={filterState} onValueChange={(value) => handleFilterChange(() => setFilterState(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  <SelectItem value="empty">Sem estado</SelectItem>
                  {uniqueStates.map((state: any) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filterActive} onValueChange={(value) => handleFilterChange(() => setFilterActive(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="yes">Ativos</SelectItem>
                  <SelectItem value="no">Inativos</SelectItem>
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

          {(filterState !== "all" || filterActive !== "all" || filterCPF.trim() !== "") && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filtros ativos</span>
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Limpar filtros
              </Button>
            </div>
          )}

          <div className="text-sm text-muted-foreground">
            Mostrando {students.length} de {filteredStudents.length} alunos
            {searchTerm && ` (filtrados de ${allStudents.length} total)`}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum aluno encontrado</p>
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Primeiro Aluno
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student: any) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.cpf || "-"}</TableCell>
                    <TableCell>{student.phone || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(student)}
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
                                Tem certeza que deseja excluir o aluno {student.name}? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(student.id)}
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
    </div>
  );
};

export default Students;
