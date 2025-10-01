import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Copy, 
  RefreshCw, 
  Trash2, 
  Eye, 
  Download,
  FileSpreadsheet,
  Filter,
  X
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { formatDateTimeSP } from "@/lib/date-utils";
import { api } from "@/lib/api";
import * as XLSX from "xlsx";

interface WebhookLog {
  id: number;
  endpoint: string;
  method: string;
  headers: any;
  body: any;
  response_status: number;
  response_body: any;
  processing_status: string;
  error_message: string | null;
  created_sale_id: number | null;
  created_student_id: number | null;
  sale_code: string | null;
  student_name: string | null;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

interface WebhookSettings {
  id: number;
  log_retention_days: number;
  auto_cleanup_enabled: boolean;
  webhook_token: string;
  created_at: string;
  updated_at: string;
}

export default function Integrations() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<WebhookSettings | null>(null);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [logToDelete, setLogToDelete] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const baseUrl = window.location.origin;
  const webhookUrl = `${baseUrl}/api/webhook/sale`;

  useEffect(() => {
    loadSettings();
    loadLogs();
  }, [filterStatus, filterStartDate, filterEndDate, currentPage]);

  const loadSettings = async () => {
    try {
      const response = await api.get("/webhook/settings");
      if (response.ok) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
    }
  };

  const loadLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus && filterStatus !== "all") params.append("status", filterStatus);
      if (filterStartDate) params.append("start_date", filterStartDate);
      if (filterEndDate) params.append("end_date", filterEndDate);
      params.append("page", currentPage.toString());
      params.append("limit", itemsPerPage.toString());

      const response = await api.get(`/webhook/logs?${params.toString()}`);
      if (response.ok) {
        setLogs(response.data);
      }
    } catch (error) {
      console.error("Erro ao carregar logs:", error);
    }
  };

  const handleCopyToken = () => {
    if (settings?.webhook_token) {
      navigator.clipboard.writeText(settings.webhook_token);
      toast({ title: "Token copiado para a área de transferência" });
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({ title: "URL copiada para a área de transferência" });
  };

  const handleRegenerateToken = async () => {
    if (!confirm("Tem certeza? O token atual será invalidado.")) return;
    
    setLoading(true);
    try {
      const response = await api.post("/webhook/settings/regenerate-token", {});
      if (response.ok) {
        setSettings(response.data);
        toast({ title: "Token regenerado com sucesso" });
      }
    } catch (error) {
      toast({ 
        title: "Erro ao regenerar token", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    if (!settings) return;
    
    setLoading(true);
    try {
      const response = await api.put("/webhook/settings", {
        log_retention_days: settings.log_retention_days,
        auto_cleanup_enabled: settings.auto_cleanup_enabled
      });
      if (response.ok) {
        setSettings(response.data);
        toast({ title: "Configurações salvas com sucesso" });
      }
    } catch (error) {
      toast({ 
        title: "Erro ao salvar configurações", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupNow = async () => {
    if (!confirm("Deseja remover todos os logs antigos agora?")) return;
    
    setLoading(true);
    try {
      const response = await api.post("/webhook/logs/cleanup", {});
      if (response.ok) {
        toast({ title: response.data.message || "Logs limpos com sucesso" });
        loadLogs();
      }
    } catch (error) {
      toast({ 
        title: "Erro ao limpar logs", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLog = async () => {
    if (!logToDelete) return;
    
    setLoading(true);
    try {
      const response = await api.delete(`/webhook/logs/${logToDelete}`);
      if (response.ok) {
        toast({ title: "Log deletado com sucesso" });
        loadLogs();
        setShowDeleteDialog(false);
        setLogToDelete(null);
      }
    } catch (error) {
      toast({ 
        title: "Erro ao deletar log", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterStartDate("");
    setFilterEndDate("");
    setCurrentPage(1);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      success: "default",
      error: "destructive",
      pending: "secondary"
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const exportToCSV = () => {
    const csv = [
      ["Data/Hora", "Endpoint", "Método", "Status HTTP", "Status Processamento", "Código Venda", "Aluno", "Erro"],
      ...logs.map(log => [
        formatDateTimeSP(log.created_at),
        log.endpoint,
        log.method,
        log.response_status?.toString() || "-",
        log.processing_status,
        log.sale_code || "-",
        log.student_name || "-",
        log.error_message || "-"
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `webhook-logs-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const exportToExcel = () => {
    const data = logs.map(log => ({
      "Data/Hora": formatDateTimeSP(log.created_at),
      "Endpoint": log.endpoint,
      "Método": log.method,
      "Status HTTP": log.response_status || "-",
      "Status Processamento": log.processing_status,
      "Código Venda": log.sale_code || "-",
      "Aluno": log.student_name || "-",
      "IP": log.ip_address || "-",
      "Erro": log.error_message || "-"
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Webhook Logs");
    XLSX.writeFile(wb, `webhook-logs-${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const exampleJson = {
    token: settings?.webhook_token || "SEU_TOKEN_AQUI",
    sale: {
      sale_code: "VENDA-2024-001",
      total_amount: 297.00,
      payment_method: "pix",
      sale_date: "2024-01-15T10:30:00Z",
      payer: {
        name: "Maria Silva",
        email: "maria@email.com",
        phone: "11999999999",
        cpf: "123.456.789-00",
        birth_date: "1990-05-15",
        address: {
          zip_code: "01234-567",
          street: "Rua das Flores",
          number: "123",
          complement: "Apto 45",
          neighborhood: "Centro",
          city: "São Paulo",
          state: "SP"
        }
      },
      students: [
        {
          name: "João Silva",
          email: "joao@email.com",
          phone: "11888888888",
          cpf: "987.654.321-00"
        }
      ]
    }
  };

  const hasActiveFilters = (filterStatus && filterStatus !== "all") || filterStartDate || filterEndDate;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Integrações via Webhook</h1>
        <p className="text-muted-foreground">
          Configure e monitore integrações automáticas de vendas
        </p>
      </div>

      {/* Documentação da API */}
      <Card>
        <CardHeader>
          <CardTitle>Documentação da API</CardTitle>
          <CardDescription>
            Endpoint para receber vendas automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>URL do Webhook</Label>
            <div className="flex gap-2 mt-2">
              <Input value={webhookUrl} readOnly className="font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label>Método</Label>
            <p className="text-sm font-mono mt-1">POST</p>
          </div>

          <div>
            <Label>Token de Autenticação</Label>
            <div className="flex gap-2 mt-2">
              <Input 
                value={settings?.webhook_token || "..."} 
                readOnly 
                type="password"
                className="font-mono text-sm" 
              />
              <Button variant="outline" size="icon" onClick={handleCopyToken}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleRegenerateToken}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Envie o token no corpo da requisição (campo "token") ou no header "x-webhook-token"
            </p>
          </div>

          <div>
            <Label>Exemplo de Requisição</Label>
            <pre className="bg-muted p-4 rounded-lg mt-2 text-xs overflow-x-auto">
              {JSON.stringify(exampleJson, null, 2)}
            </pre>
          </div>

          <div>
            <Label>Respostas Possíveis</Label>
            <div className="space-y-2 mt-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge>200</Badge>
                <span>Venda criada com sucesso</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">401</Badge>
                <span>Token inválido</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="destructive">500</Badge>
                <span>Erro no processamento</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configurações */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
          <CardDescription>
            Gerencie a retenção e limpeza de logs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Dias para manter logs</Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={settings?.log_retention_days || 30}
                onChange={(e) => setSettings(prev => prev ? {
                  ...prev,
                  log_retention_days: parseInt(e.target.value)
                } : null)}
                className="mt-2"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="auto-cleanup">Limpeza automática</Label>
              <Switch
                id="auto-cleanup"
                checked={settings?.auto_cleanup_enabled || false}
                onCheckedChange={(checked) => setSettings(prev => prev ? {
                  ...prev,
                  auto_cleanup_enabled: checked
                } : null)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleUpdateSettings} disabled={loading}>
              Salvar Configurações
            </Button>
            <Button 
              variant="outline" 
              onClick={handleCleanupNow} 
              disabled={loading}
            >
              Limpar Logs Antigos Agora
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs de Webhook */}
      <Card>
        <CardHeader>
          <CardTitle>Logs de Webhook</CardTitle>
          <CardDescription>
            Histórico de requisições recebidas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros e Exportação */}
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={exportToCSV}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={exportToExcel}>
                <FileSpreadsheet className="h-4 w-4" />
              </Button>
              {hasActiveFilters && (
                <Button variant="outline" size="icon" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Itens por página */}
          <div className="flex items-center gap-2">
            <Label>Itens por página:</Label>
            <Select 
              value={itemsPerPage.toString()} 
              onValueChange={(v) => setItemsPerPage(parseInt(v))}
            >
              <SelectTrigger className="w-[100px]">
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

          {/* Tabela de Logs */}
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left text-sm font-medium">Data/Hora</th>
                  <th className="p-3 text-left text-sm font-medium">Endpoint</th>
                  <th className="p-3 text-left text-sm font-medium">Status HTTP</th>
                  <th className="p-3 text-left text-sm font-medium">Status</th>
                  <th className="p-3 text-left text-sm font-medium">Venda</th>
                  <th className="p-3 text-left text-sm font-medium">Aluno</th>
                  <th className="p-3 text-left text-sm font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      Nenhum log encontrado
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-t hover:bg-muted/50">
                      <td className="p-3 text-sm">{formatDateTimeSP(log.created_at)}</td>
                      <td className="p-3 text-sm font-mono">{log.endpoint}</td>
                      <td className="p-3 text-sm">
                        <Badge variant={log.response_status === 200 ? "default" : "destructive"}>
                          {log.response_status || "-"}
                        </Badge>
                      </td>
                      <td className="p-3">{getStatusBadge(log.processing_status)}</td>
                      <td className="p-3 text-sm">{log.sale_code || "-"}</td>
                      <td className="p-3 text-sm">{log.student_name || "-"}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedLog(log);
                              setShowLogDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setLogToDelete(log.id);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes do Log */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
            <DialogDescription>
              Informações completas da requisição
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data/Hora</Label>
                  <p className="text-sm mt-1">{formatDateTimeSP(selectedLog.created_at)}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedLog.processing_status)}</div>
                </div>
                <div>
                  <Label>Endpoint</Label>
                  <p className="text-sm mt-1 font-mono">{selectedLog.endpoint}</p>
                </div>
                <div>
                  <Label>Método</Label>
                  <p className="text-sm mt-1 font-mono">{selectedLog.method}</p>
                </div>
                <div>
                  <Label>IP</Label>
                  <p className="text-sm mt-1 font-mono">{selectedLog.ip_address || "-"}</p>
                </div>
                <div>
                  <Label>Status HTTP</Label>
                  <p className="text-sm mt-1">{selectedLog.response_status || "-"}</p>
                </div>
              </div>

              {selectedLog.error_message && (
                <div>
                  <Label>Erro</Label>
                  <p className="text-sm mt-1 text-destructive">{selectedLog.error_message}</p>
                </div>
              )}

              <div>
                <Label>Corpo da Requisição</Label>
                <pre className="bg-muted p-4 rounded-lg mt-2 text-xs overflow-x-auto">
                  {JSON.stringify(selectedLog.body, null, 2)}
                </pre>
              </div>

              <div>
                <Label>Resposta</Label>
                <pre className="bg-muted p-4 rounded-lg mt-2 text-xs overflow-x-auto">
                  {JSON.stringify(selectedLog.response_body, null, 2)}
                </pre>
              </div>

              <div>
                <Label>Headers</Label>
                <pre className="bg-muted p-4 rounded-lg mt-2 text-xs overflow-x-auto">
                  {JSON.stringify(selectedLog.headers, null, 2)}
                </pre>
              </div>

              <div>
                <Label>User Agent</Label>
                <p className="text-xs mt-1 font-mono break-all">{selectedLog.user_agent || "-"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar log?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O log será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLog}>
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
