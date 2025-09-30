import { useState } from "react";
import { Plus, Search, Eye, FileCheck, Settings, Edit, Trash2, X, Download, FileSpreadsheet } from "lucide-react";
import * as XLSX from 'xlsx';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CertificationForm } from "@/components/forms/CertificationForm";
import { CertificationStatusUpdate } from "@/components/forms/CertificationStatusUpdate";
import { CertificationEditForm } from "@/components/forms/CertificationEditForm";
import { CertificationTimeline } from "@/components/CertificationTimeline";
import { MiniTimeline } from "@/components/MiniTimeline";
import { SLAConfigForm } from "@/components/forms/SLAConfigForm";
import { formatDateSP, formatDateTimeSP } from "@/lib/date-utils";

const CertificationProcess = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<any>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSLADialogOpen, setIsSLADialogOpen] = useState(false);
  
  // Filtros
  const [filterCertifier, setFilterCertifier] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPhysical, setFilterPhysical] = useState<string>("all");
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(30);
  
  const queryClient = useQueryClient();

  // Buscar configurações de SLA
  const { data: slaConfig = [] } = useQuery({
    queryKey: ["certification-sla"],
    queryFn: async () => {
      const result = await api.getCertificationSLA();
      return result.ok ? (result.data || []) : [];
    },
  });

  // Buscar todos os alunos com seus processos de certificação
  const { data: allStudents = [], isLoading } = useQuery({
    queryKey: ["students-with-certification", searchTerm],
    queryFn: async () => {
      const result = await api.getStudents({ search: searchTerm });
      if (!result.ok) return [];
      
      const studentsData = ((result.data as any)?.students || []);
      
      // Para cada aluno, tentar buscar o processo de certificação
      const studentsWithCertification = await Promise.all(
        studentsData.map(async (student: any) => {
          try {
            const certResult = await api.getCertificationProcess(student.id);
            return {
              ...student,
              certification: certResult.ok ? certResult.data : null,
            };
          } catch {
            return {
              ...student,
              certification: null,
            };
          }
        })
      );
      
      return studentsWithCertification;
    },
  });

  // Buscar certificadoras para o filtro
  const { data: certifiers = [] } = useQuery({
    queryKey: ["certifiers"],
    queryFn: async () => {
      const result = await api.getCertifiers();
      return result.ok ? (result.data || []) : [];
    },
  });

  // Aplicar filtros aos alunos
  const filteredStudents = allStudents.filter((student: any) => {
    // Filtro por certificadora
    if (filterCertifier !== "all") {
      if (!student.certification) return filterCertifier === "none";
      if (filterCertifier === "none") return false;
      if (student.certification.certifier_id?.toString() !== filterCertifier) return false;
    }

    // Filtro por status
    if (filterStatus !== "all") {
      if (!student.certification) return filterStatus === "not_started";
      if (filterStatus === "not_started") return false;
      if (student.certification.status !== filterStatus) return false;
    }

    // Filtro por certificado físico
    if (filterPhysical !== "all") {
      if (!student.certification) return false;
      const wantsPhysical = student.certification.wants_physical;
      if (filterPhysical === "yes" && !wantsPhysical) return false;
      if (filterPhysical === "no" && wantsPhysical) return false;
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
    setFilterCertifier("all");
    setFilterStatus("all");
    setFilterPhysical("all");
    setCurrentPage(1);
  };

  const deleteMutation = useMutation({
    mutationFn: (studentId: number) => api.deleteCertificationProcess(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students-with-certification"] });
      toast.success("Processo de certificação excluído com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao excluir processo de certificação");
    },
  });

  const handleViewDetails = (student: any) => {
    setSelectedProcess(student);
  };

  const handleUpdateStatus = (student: any) => {
    setSelectedProcess(student);
    setIsStatusDialogOpen(true);
  };

  const handleEditProcess = (student: any) => {
    setSelectedProcess(student);
    setIsEditDialogOpen(true);
  };

  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ["students-with-certification"] });
  };

  const handleCloseStatusDialog = () => {
    setIsStatusDialogOpen(false);
    setSelectedProcess(null);
    queryClient.invalidateQueries({ queryKey: ["students-with-certification"] });
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedProcess(null);
    queryClient.invalidateQueries({ queryKey: ["students-with-certification"] });
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return <Badge variant="secondary">Não Iniciado</Badge>;
    
    const statusConfig: Record<string, { label: string; variant: any }> = {
      welcome: { label: "Boas-Vindas", variant: "secondary" },
      exam_in_progress: { label: "Prova em Andamento", variant: "outline" },
      documents_requested: { label: "Documentação Solicitada", variant: "outline" },
      documents_under_review: { label: "Documentação em Análise", variant: "default" },
      certification_started: { label: "Certificação Iniciada", variant: "default" },
      digital_certificate_sent: { label: "Certificado Digital Enviado", variant: "default" },
      physical_certificate_sent: { label: "Certificado Físico Enviado", variant: "default" },
      completed: { label: "Concluído", variant: "default" },
    };

    const config = statusConfig[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (date?: string) => {
    return formatDateSP(date);
  };

  const exportToCSV = () => {
    if (filteredStudents.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }

    const headers = [
      "Nome do Aluno",
      "Email",
      "CPF",
      "Certificadora",
      "Status",
      "Certificado Físico",
      "Código de Rastreio",
      "Data de Criação",
      "Prova Iniciada",
      "Documentação Solicitada",
      "Documentação em Análise",
      "Certificação Iniciada",
      "Certificado Digital Enviado",
      "Certificado Físico Enviado",
      "Concluído"
    ];

    const csvRows = filteredStudents.map((student: any) => {
      const cert = student.certification;
      const statusLabel = cert ? getStatusLabel(cert.status) : "Não Iniciado";
      
      return [
        `"${student.name || ''}"`,
        `"${student.email || ''}"`,
        `"${student.cpf || ''}"`,
        `"${cert?.certifier_name || '-'}"`,
        `"${statusLabel}"`,
        cert?.wants_physical ? "Sim" : cert ? "Não" : "-",
        `"${cert?.physical_tracking_code || '-'}"`,
        cert?.created_at ? formatDate(cert.created_at) : "-",
        cert?.exam_started_at ? formatDate(cert.exam_started_at) : "-",
        cert?.documents_requested_at ? formatDate(cert.documents_requested_at) : "-",
        cert?.documents_under_review_at ? formatDate(cert.documents_under_review_at) : "-",
        cert?.certification_started_at ? formatDate(cert.certification_started_at) : "-",
        cert?.digital_certificate_sent_at ? formatDate(cert.digital_certificate_sent_at) : "-",
        cert?.physical_certificate_sent_at ? formatDate(cert.physical_certificate_sent_at) : "-",
        cert?.completed_at ? formatDate(cert.completed_at) : "-"
      ].join(",");
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `processos_certificacao_${new Date().toISOString().split('T')[0]}.csv`);
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

    const data = filteredStudents.map((student: any) => {
      const cert = student.certification;
      const statusLabel = cert ? getStatusLabel(cert.status) : "Não Iniciado";
      
      return {
        "Nome do Aluno": student.name || '',
        "Email": student.email || '',
        "CPF": student.cpf || '',
        "Certificadora": cert?.certifier_name || '-',
        "Status": statusLabel,
        "Certificado Físico": cert?.wants_physical ? "Sim" : cert ? "Não" : "-",
        "Código de Rastreio": cert?.physical_tracking_code || '-',
        "Data de Criação": cert?.created_at ? formatDate(cert.created_at) : "-",
        "Prova Iniciada": cert?.exam_started_at ? formatDate(cert.exam_started_at) : "-",
        "Documentação Solicitada": cert?.documents_requested_at ? formatDate(cert.documents_requested_at) : "-",
        "Documentação em Análise": cert?.documents_under_review_at ? formatDate(cert.documents_under_review_at) : "-",
        "Certificação Iniciada": cert?.certification_started_at ? formatDate(cert.certification_started_at) : "-",
        "Certificado Digital Enviado": cert?.digital_certificate_sent_at ? formatDate(cert.digital_certificate_sent_at) : "-",
        "Certificado Físico Enviado": cert?.physical_certificate_sent_at ? formatDate(cert.physical_certificate_sent_at) : "-",
        "Concluído": cert?.completed_at ? formatDate(cert.completed_at) : "-"
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Processos de Certificação");

    // Ajustar largura das colunas
    const maxWidth = 30;
    worksheet['!cols'] = [
      { wch: 25 }, // Nome
      { wch: 30 }, // Email
      { wch: 15 }, // CPF
      { wch: 25 }, // Certificadora
      { wch: 20 }, // Status
      { wch: 18 }, // Certificado Físico
      { wch: 20 }, // Código de Rastreio
      { wch: 15 }, // Data de Criação
      { wch: 18 }, // Prova Iniciada
      { wch: 22 }, // Documentação Solicitada
      { wch: 22 }, // Documentação em Análise
      { wch: 20 }, // Certificação Iniciada
      { wch: 25 }, // Certificado Digital
      { wch: 25 }, // Certificado Físico Enviado
      { wch: 15 }, // Concluído
    ];

    XLSX.writeFile(workbook, `processos_certificacao_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Excel exportado com sucesso!");
  };

  const getStatusLabel = (status?: string) => {
    if (!status) return "Não Iniciado";
    
    const statusConfig: Record<string, string> = {
      welcome: "Boas-Vindas",
      exam_in_progress: "Prova em Andamento",
      documents_requested: "Documentação Solicitada",
      documents_under_review: "Documentação em Análise",
      certification_started: "Certificação Iniciada",
      digital_certificate_sent: "Certificado Digital Enviado",
      physical_certificate_sent: "Certificado Físico Enviado",
      completed: "Concluído",
    };

    return statusConfig[status] || status;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Processo de Certificação</h1>
          <p className="text-muted-foreground">Acompanhe o processo de certificação dos alunos</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isSLADialogOpen} onOpenChange={setIsSLADialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Configurar Prazos
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Configurar Prazos das Etapas</DialogTitle>
                <DialogDescription>
                  Defina o tempo máximo para cada etapa e quando alertar
                </DialogDescription>
              </DialogHeader>
              <SLAConfigForm onSuccess={() => {
                setIsSLADialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ["certification-sla"] });
              }} />
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Iniciar Processo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Iniciar Processo de Certificação</DialogTitle>
                <DialogDescription>
                  {selectedProcess?.studentName && (
                    <span className="text-sm">Aluno: <strong>{selectedProcess.studentName}</strong></span>
                  )}
                </DialogDescription>
              </DialogHeader>
              <CertificationForm 
                onSuccess={handleCloseCreateDialog}
                preSelectedStudentId={selectedProcess?.studentId}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Pesquisar e Filtrar</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportToExcel}
              disabled={filteredStudents.length === 0}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportToCSV}
              disabled={filteredStudents.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={filterCertifier} onValueChange={(value) => handleFilterChange(() => setFilterCertifier(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por certificadora" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as certificadoras</SelectItem>
                <SelectItem value="none">Sem certificadora atribuída</SelectItem>
                {certifiers.map((certifier: any) => (
                  <SelectItem key={certifier.id} value={certifier.id.toString()}>
                    {certifier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={(value) => handleFilterChange(() => setFilterStatus(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status do processo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="not_started">🔴 Não Iniciado</SelectItem>
                <SelectItem value="pending">⏳ Pendente</SelectItem>
                <SelectItem value="documents_sent">📄 Documentos Enviados</SelectItem>
                <SelectItem value="under_review">🔍 Em Análise</SelectItem>
                <SelectItem value="approved">✅ Aprovado</SelectItem>
                <SelectItem value="certificate_issued">📜 Certificado Emitido</SelectItem>
                <SelectItem value="certificate_sent">📮 Certificado Enviado</SelectItem>
                <SelectItem value="completed">🎉 Concluído</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPhysical} onValueChange={(value) => handleFilterChange(() => setFilterPhysical(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Deseja certificado físico?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos (físico e digital)</SelectItem>
                <SelectItem value="yes">Somente com certificado físico</SelectItem>
                <SelectItem value="no">Somente certificado digital</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={clearFilters}
              className="w-full"
            >
              <X className="mr-2 h-4 w-4" />
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Mostrando {students.length === 0 ? 0 : startIndex + 1} a {Math.min(endIndex, filteredStudents.length)} de {filteredStudents.length} registros</span>
            </div>
            <Select 
              value={itemsPerPage.toString()} 
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 por página</SelectItem>
                <SelectItem value="30">30 por página</SelectItem>
                <SelectItem value="50">50 por página</SelectItem>
                <SelectItem value="100">100 por página</SelectItem>
                <SelectItem value="500">500 por página</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum aluno encontrado com os filtros aplicados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Certificadora</TableHead>
                  <TableHead className="w-[300px]">Progresso</TableHead>
                  <TableHead>Certificado Físico</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student: any) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      {student.certification?.certifier_name || "-"}
                    </TableCell>
                    <TableCell>
                      {student.certification ? (
                        <MiniTimeline 
                          currentStatus={student.certification.status}
                          certification={student.certification}
                          slaConfig={slaConfig}
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">Não iniciado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {student.certification?.wants_physical ? (
                        <Badge variant="outline">Sim</Badge>
                      ) : student.certification ? (
                        <Badge variant="secondary">Não</Badge>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {student.certification ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDetails(student)}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditProcess(student)}
                              title="Editar processo"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUpdateStatus(student)}
                              title="Atualizar status"
                            >
                              <FileCheck className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" title="Deletar processo">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir o processo de certificação de <strong>{student.name}</strong>? Esta ação não pode ser desfeita e todas as informações do processo serão perdidas.
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
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedProcess({ studentId: student.id, studentName: student.name });
                              setIsCreateDialogOpen(true);
                            }}
                          >
                            Iniciar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Paginação */}
          {filteredStudents.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                Primeira
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Próxima
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                Última
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para visualizar detalhes */}
      <Dialog open={!!selectedProcess && !isStatusDialogOpen && !isEditDialogOpen} onOpenChange={() => setSelectedProcess(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Processo de Certificação</DialogTitle>
            <DialogDescription>
              Acompanhe todo o fluxo do processo de certificação do aluno
            </DialogDescription>
          </DialogHeader>
          {selectedProcess?.certification && (
            <div className="space-y-6">
              {/* Informações gerais */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/50">
                <div>
                  <p className="text-sm text-muted-foreground">Aluno</p>
                  <p className="font-medium">{selectedProcess.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedProcess.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Certificadora</p>
                  <p className="font-medium">{selectedProcess.certification.certifier_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status Atual</p>
                  {getStatusBadge(selectedProcess.certification.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Certificado Físico</p>
                  <p className="font-medium">
                    {selectedProcess.certification.wants_physical ? "Sim" : "Não"}
                  </p>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h3 className="font-semibold mb-4 text-lg">Linha do Tempo</h3>
                <CertificationTimeline 
                  currentStatus={selectedProcess.certification.status}
                  certification={selectedProcess.certification}
                  studentName={selectedProcess.name}
                  studentPhone={selectedProcess.phone}
                />
              </div>

              {/* Botão para atualizar status */}
              <div className="flex justify-end">
                <Button onClick={() => handleUpdateStatus(selectedProcess)}>
                  <FileCheck className="mr-2 h-4 w-4" />
                  Atualizar Status
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para atualizar status */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Atualizar Status de Certificação</DialogTitle>
          </DialogHeader>
          {selectedProcess && (
            <CertificationStatusUpdate
              studentId={selectedProcess.id}
              currentStatus={selectedProcess.certification?.status}
              onSuccess={handleCloseStatusDialog}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para editar processo */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Processo de Certificação</DialogTitle>
            <DialogDescription>
              Altere as configurações do processo de certificação
            </DialogDescription>
          </DialogHeader>
          {selectedProcess && (
            <CertificationEditForm
              studentId={selectedProcess.id}
              certification={selectedProcess.certification}
              onSuccess={handleCloseEditDialog}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CertificationProcess;
