import { useState } from "react";
import { Plus, Search, Eye, FileCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { CertificationForm } from "@/components/forms/CertificationForm";
import { CertificationStatusUpdate } from "@/components/forms/CertificationStatusUpdate";

const CertificationProcess = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<any>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Buscar todos os alunos com seus processos de certificação
  const { data: students = [], isLoading } = useQuery({
    queryKey: ["students-with-certification", searchTerm],
    queryFn: async () => {
      const result = await api.getStudents({ search: searchTerm });
      if (!result.ok) return [];
      
      const studentsData = result.data || [];
      
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

  const handleViewDetails = (student: any) => {
    setSelectedProcess(student);
  };

  const handleUpdateStatus = (student: any) => {
    setSelectedProcess(student);
    setIsStatusDialogOpen(true);
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
            </DialogHeader>
            <CertificationForm onSuccess={handleCloseCreateDialog} />
          </DialogContent>
        </Dialog>
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
                  <TableHead>Status</TableHead>
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
                      {getStatusBadge(student.certification?.status)}
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
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUpdateStatus(student)}
                            >
                              <FileCheck className="h-4 w-4" />
                            </Button>
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
      <Dialog open={!!selectedProcess && !isStatusDialogOpen} onOpenChange={() => setSelectedProcess(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Processo de Certificação</DialogTitle>
          </DialogHeader>
          {selectedProcess?.certification && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Aluno</p>
                  <p className="font-medium">{selectedProcess.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedProcess.certification.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Certificadora</p>
                  <p className="font-medium">{selectedProcess.certification.certifier_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Certificado Físico</p>
                  <p className="font-medium">
                    {selectedProcess.certification.wants_physical ? "Sim" : "Não"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Timeline</h3>
                <div className="space-y-2 border-l-2 pl-4">
                  <div>
                    <p className="text-sm font-medium">Criado em</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(selectedProcess.certification.created_at)}
                    </p>
                  </div>
                  {selectedProcess.certification.documents_sent_at && (
                    <div>
                      <p className="text-sm font-medium">Documentos Enviados</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(selectedProcess.certification.documents_sent_at)}
                      </p>
                    </div>
                  )}
                  {selectedProcess.certification.approval_date && (
                    <div>
                      <p className="text-sm font-medium">Aprovado</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(selectedProcess.certification.approval_date)}
                      </p>
                    </div>
                  )}
                  {selectedProcess.certification.certificate_issued_at && (
                    <div>
                      <p className="text-sm font-medium">Certificado Emitido</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(selectedProcess.certification.certificate_issued_at)}
                      </p>
                    </div>
                  )}
                  {selectedProcess.certification.certificate_sent_at && (
                    <div>
                      <p className="text-sm font-medium">Certificado Enviado</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(selectedProcess.certification.certificate_sent_at)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {selectedProcess.certification.physical_tracking_code && (
                <div>
                  <p className="text-sm text-muted-foreground">Código de Rastreio</p>
                  <p className="font-mono font-medium">
                    {selectedProcess.certification.physical_tracking_code}
                  </p>
                </div>
              )}
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
    </div>
  );
};

export default CertificationProcess;
