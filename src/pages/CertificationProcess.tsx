import { useState } from "react";
import { Plus, Search, Eye, FileCheck, Settings, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CertificationForm } from "@/components/forms/CertificationForm";
import { CertificationStatusUpdate } from "@/components/forms/CertificationStatusUpdate";
import { CertificationEditForm } from "@/components/forms/CertificationEditForm";
import { CertificationTimeline } from "@/components/CertificationTimeline";
import { MiniTimeline } from "@/components/MiniTimeline";
import { SLAConfigForm } from "@/components/forms/SLAConfigForm";

const CertificationProcess = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<any>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSLADialogOpen, setIsSLADialogOpen] = useState(false);
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

  // Filtrar apenas alunos com processo iniciado para a tabela
  const students = allStudents.filter((student: any) => student.certification !== null);

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
      pending: { label: "Pendente", variant: "secondary" },
      documents_sent: { label: "Documentos Enviados", variant: "outline" },
      under_review: { label: "Em Análise", variant: "default" },
      approved: { label: "Aprovado", variant: "default" },
      certificate_issued: { label: "Certificado Emitido", variant: "default" },
      certificate_sent: { label: "Certificado Enviado", variant: "default" },
      completed: { label: "Concluído", variant: "default" },
    };

    const config = statusConfig[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('pt-BR');
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
        <CardHeader>
          <CardTitle>Pesquisar Alunos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou CPF..."
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
          ) : students.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum aluno encontrado</p>
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
