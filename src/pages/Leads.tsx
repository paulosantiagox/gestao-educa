import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  RefreshCw,
  ChevronUp,
} from "lucide-react";
import { api } from "@/lib/api";

interface Lead {
  id: number;
  nome: string;
  email: string;
  whatsapp: string;
  escola: string;
  data_cadastro: string;
  var1: string;
  var2: string;
  var3: string;
  var4: string;
  var5: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  created_at: string;
  updated_at: string;
  position: number;
}

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("data_cadastro");
  const [sortOrder, setSortOrder] = useState("desc");

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        q: searchTerm,
        sortBy,
        sortOrder,
      });

      const response = await api.get(`/api/leads?${params}`);

      if (response.ok && response.data) {
        setLeads(response.data.leads || []);
        setTotalPages(response.data.totalPages || 1);
        setTotalLeads(response.data.total || 0);
      }
    } catch (error) {
      console.error("Erro ao carregar leads:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [currentPage, pageSize, searchTerm, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      // Criar data a partir da string ISO, mas usar UTC para evitar conversões de timezone
      const date = new Date(dateString);
      
      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        console.error('Data inválida:', dateString);
        return "-";
      }
      
      // Formatar usando UTC para mostrar exatamente como está no banco
      const dayStr = String(date.getUTCDate()).padStart(2, '0');
      const monthStr = String(date.getUTCMonth() + 1).padStart(2, '0');
      const yearStr = date.getUTCFullYear();
      const hoursStr = String(date.getUTCHours()).padStart(2, '0');
      const minutesStr = String(date.getUTCMinutes()).padStart(2, '0');
      const secondsStr = String(date.getUTCSeconds()).padStart(2, '0');
      
      return `${dayStr}/${monthStr}/${yearStr} ${hoursStr}:${minutesStr}:${secondsStr}`;
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return "-";
    }
  };



  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground">
            Gerencie todos os leads do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLeads}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Lead
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lista de Leads ({totalLeads})</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, email ou telefone..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 por página</SelectItem>
                <SelectItem value="25">25 por página</SelectItem>
                <SelectItem value="50">50 por página</SelectItem>
                <SelectItem value="100">100 por página</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("position")}
                          className="h-auto p-0 font-semibold"
                        >
                          Posição
                          {sortBy === "position" && (
                            <ChevronUp
                              className={`ml-1 h-4 w-4 ${
                                sortOrder === "desc" ? "rotate-180" : ""
                              }`}
                            />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("whatsapp")}
                          className="h-auto p-0 font-semibold"
                        >
                          WhatsApp
                          {sortBy === "whatsapp" && (
                            <ChevronUp
                              className={`ml-1 h-4 w-4 ${
                                sortOrder === "desc" ? "rotate-180" : ""
                              }`}
                            />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>Escola</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("data_cadastro")}
                          className="h-auto p-0 font-semibold"
                        >
                          Data Cadastro
                          {sortBy === "data_cadastro" && (
                            <ChevronUp
                              className={`ml-1 h-4 w-4 ${
                                sortOrder === "desc" ? "rotate-180" : ""
                              }`}
                            />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>Var1</TableHead>
                      <TableHead>Var2</TableHead>
                      <TableHead>UTM Source</TableHead>
                      <TableHead>UTM Campaign</TableHead>
                      <TableHead>UTM Term</TableHead>
                      <TableHead>UTM Content</TableHead>
                      <TableHead>UTM Medium</TableHead>

                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead, index) => (
                      <TableRow key={lead.id}>
                        <TableCell className="whitespace-nowrap">
                          {lead.position}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{lead.whatsapp || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{lead.escola || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(lead.data_cadastro)}</TableCell>
                        <TableCell className="whitespace-nowrap">{lead.var1 || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{lead.var2 || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{lead.utm_source || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{lead.utm_campaign || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{lead.utm_term || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{lead.utm_content || "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{lead.utm_medium || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {(currentPage - 1) * pageSize + 1} a{" "}
                    {Math.min(currentPage * pageSize, totalLeads)} de {totalLeads} leads
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
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Leads;