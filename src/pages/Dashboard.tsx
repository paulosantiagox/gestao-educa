import { Users, GraduationCap, Clock, CheckCircle, TrendingUp, AlertCircle, FileCheck, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658'];

const Dashboard = () => {
  // Buscar estatísticas do dashboard
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const result = await api.getDashboardStats();
      return result.ok ? result.data : null;
    },
  });

  // Buscar todos os alunos com certificação
  const { data: allStudents = [] } = useQuery({
    queryKey: ["students-with-certification-dashboard"],
    queryFn: async () => {
      const result = await api.getStudents({});
      if (!result.ok) return [];
      
      const studentsData = ((result.data as any)?.students || []);
      
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

  // Buscar SLA config para calcular atrasos
  const { data: slaConfig = [] } = useQuery({
    queryKey: ["certification-sla-dashboard"],
    queryFn: async () => {
      const result = await api.getCertificationSLA();
      return result.ok ? (result.data || []) : [];
    },
  });

  // Calcular estatísticas
  const totalStudents = allStudents.length;
  const studentsWithCertification = allStudents.filter((s: any) => s.certification);
  const completedCertifications = studentsWithCertification.filter((s: any) => s.certification.status === 'completed').length;
  const inProgress = studentsWithCertification.filter((s: any) => s.certification.status !== 'completed').length;
  const completionRate = totalStudents > 0 ? Math.round((completedCertifications / totalStudents) * 100) : 0;
  const wantsPhysical = studentsWithCertification.filter((s: any) => s.certification.wants_physical).length;

  // Status por etapa
  const statusCounts: Record<string, number> = {
    not_started: allStudents.filter((s: any) => !s.certification).length,
    pending: 0,
    documents_sent: 0,
    under_review: 0,
    approved: 0,
    certificate_issued: 0,
    certificate_sent: 0,
    completed: 0,
  };

  studentsWithCertification.forEach((student: any) => {
    const status = student.certification?.status;
    if (status && statusCounts.hasOwnProperty(status)) {
      statusCounts[status]++;
    }
  });

  // Dados para gráfico de pizza
  const pieData = [
    { name: 'Não Iniciado', value: statusCounts.not_started },
    { name: 'Pendente', value: statusCounts.pending },
    { name: 'Docs Enviados', value: statusCounts.documents_sent },
    { name: 'Em Análise', value: statusCounts.under_review },
    { name: 'Aprovado', value: statusCounts.approved },
    { name: 'Cert. Emitido', value: statusCounts.certificate_issued },
    { name: 'Cert. Enviado', value: statusCounts.certificate_sent },
    { name: 'Concluído', value: statusCounts.completed },
  ].filter(item => item.value > 0);

  // Processos atrasados
  const delayedProcesses = studentsWithCertification.filter((student: any) => {
    const cert = student.certification;
    if (!cert || cert.status === 'completed') return false;

    const sla = slaConfig.find((s: any) => s.status === cert.status);
    if (!sla) return false;

    const statusDateField = getStatusDateField(cert.status);
    const statusDate = cert[statusDateField];
    if (!statusDate) return false;

    const daysSince = Math.floor((Date.now() - new Date(statusDate).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince >= sla.days_limit;
  });

  // Estatísticas por certificadora
  const certifierStats: Record<string, { name: string; count: number }> = {};
  studentsWithCertification.forEach((student: any) => {
    const certifierId = student.certification?.certifier_id;
    const certifierName = student.certification?.certifier_name;
    if (certifierId && certifierName) {
      if (!certifierStats[certifierId]) {
        certifierStats[certifierId] = { name: certifierName, count: 0 };
      }
      certifierStats[certifierId].count++;
    }
  });

  const certifierChartData = Object.values(certifierStats);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do sistema de certificação</p>
      </div>

      {/* Cards de estatísticas principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alunos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">Alunos cadastrados no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificados Emitidos</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCertifications}</div>
            <p className="text-xs text-muted-foreground">Processos de certificação concluídos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgress}</div>
            <p className="text-xs text-muted-foreground">Em processo de certificação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground">Índice de conclusão de certificações</p>
          </CardContent>
        </Card>
      </div>

      {/* Linha 2: Cards secundários */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processos Atrasados</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{delayedProcesses.length}</div>
            <p className="text-xs text-muted-foreground">Processos acima do prazo SLA</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processos Iniciados</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentsWithCertification.length}</div>
            <p className="text-xs text-muted-foreground">Total de certificações iniciadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificados Físicos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wantsPhysical}</div>
            <p className="text-xs text-muted-foreground">Solicitações de certificado físico</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">Sem dados para exibir</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Processos por Certificadora</CardTitle>
          </CardHeader>
          <CardContent>
            {certifierChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={certifierChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">Sem dados para exibir</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status detalhado e processos atrasados */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento por Etapa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { label: "🔴 Não Iniciado", value: statusCounts.not_started, color: "bg-gray-500" },
                { label: "⏳ Pendente", value: statusCounts.pending, color: "bg-yellow-500" },
                { label: "📄 Documentos Enviados", value: statusCounts.documents_sent, color: "bg-blue-500" },
                { label: "🔍 Em Análise", value: statusCounts.under_review, color: "bg-purple-500" },
                { label: "✅ Aprovado", value: statusCounts.approved, color: "bg-green-500" },
                { label: "📜 Certificado Emitido", value: statusCounts.certificate_issued, color: "bg-teal-500" },
                { label: "📮 Certificado Enviado", value: statusCounts.certificate_sent, color: "bg-indigo-500" },
                { label: "🎉 Concluído", value: statusCounts.completed, color: "bg-green-600" },
              ].map((item) => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="font-bold">{item.value}</span>
                  </div>
                  <Progress 
                    value={totalStudents > 0 ? (item.value / totalStudents) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Processos Atrasados ({delayedProcesses.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {delayedProcesses.length > 0 ? (
                delayedProcesses.map((student: any) => {
                  const cert = student.certification;
                  const sla = slaConfig.find((s: any) => s.status === cert.status);
                  const statusDateField = getStatusDateField(cert.status);
                  const statusDate = cert[statusDateField];
                  const daysSince = Math.floor((Date.now() - new Date(statusDate).getTime()) / (1000 * 60 * 60 * 24));
                  const daysDelayed = daysSince - (sla?.days_limit || 0);

                  return (
                    <div key={student.id} className="p-3 border rounded-lg space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{student.name}</span>
                        <Badge variant="destructive">{daysDelayed} dias de atraso</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Status: {getStatusLabel(cert.status)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Certificadora: {cert.certifier_name}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum processo atrasado! 🎉
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Helper functions
function getStatusDateField(status: string): string {
  const fieldMap: Record<string, string> = {
    pending: 'created_at',
    documents_sent: 'documents_sent_at',
    under_review: 'under_review_at',
    approved: 'under_review_at',
    certificate_issued: 'digital_delivered_at',
    certificate_sent: 'physical_shipping_at',
  };
  return fieldMap[status] || 'created_at';
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendente',
    documents_sent: 'Documentos Enviados',
    under_review: 'Em Análise',
    approved: 'Aprovado',
    certificate_issued: 'Certificado Emitido',
    certificate_sent: 'Certificado Enviado',
    completed: 'Concluído',
  };
  return labels[status] || status;
}

export default Dashboard;
