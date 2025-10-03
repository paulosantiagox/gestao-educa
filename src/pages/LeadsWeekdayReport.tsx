import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, TrendingUp, BarChart3, RefreshCw, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { api } from '@/lib/api';
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';
import { exportToCSV, exportToExcel, formatDataForExport } from '@/utils/exportUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WeekdayData {
  day_number: number;
  weekday: string;
  count: number;
  percentage: number;
}

interface ReportData {
  weekdayStats: WeekdayData[];
  totalLeads: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];

const LeadsWeekdayReport: React.FC = () => {
  const [data, setData] = useState<ReportData>({ weekdayStats: [], totalLeads: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    source: '',
    responsible: ''
  });
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [availableResponsibles, setAvailableResponsibles] = useState<string[]>([]);

  const { lastUpdate, forceUpdate, isUpdating } = useRealTimeUpdates(
    fetchData,
    {
      interval: 30000,
      onUpdate: () => {
        console.log('Dados do relatório por dia da semana atualizados automaticamente');
      }
    }
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.source) params.append('source', filters.source);
      if (filters.responsible) params.append('responsible', filters.responsible);

      const response = await api.get(`/api/leads/analytics/weekday?${params.toString()}`);
      
      if (response.ok && response.data) {
        setData(response.data);
      }

      // Buscar opções para filtros
      const dashboardResponse = await api.get('/api/leads/dashboard');
      if (dashboardResponse.ok && dashboardResponse.data) {
        if (dashboardResponse.data.leadsBySource) {
          setAvailableSources(dashboardResponse.data.leadsBySource.map((item: any) => item.source));
        }
        if (dashboardResponse.data.leadsByVar1) {
          setAvailableResponsibles(dashboardResponse.data.leadsByVar1.map((item: any) => item.var1));
        }
      }
    } catch (error) {
      console.error('Erro ao carregar relatório:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleExportCSV = async () => {
    const exportData = formatDataForExport(data.weekdayStats, 'weekday-report');
    exportToCSV(exportData, `relatorio-dia-semana-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const handleExportExcel = async () => {
    const exportData = formatDataForExport(data.weekdayStats, 'weekday-report');
    exportToExcel(exportData, `relatorio-dia-semana-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const getBestDay = () => {
    if (data.weekdayStats.length === 0) return null;
    return data.weekdayStats.reduce((prev, current) => 
      (prev.count > current.count) ? prev : current
    );
  };

  const getWorstDay = () => {
    if (data.weekdayStats.length === 0) return null;
    return data.weekdayStats.reduce((prev, current) => 
      (prev.count < current.count) ? prev : current
    );
  };

  const bestDay = getBestDay();
  const worstDay = getWorstDay();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatório por Dia da Semana</h1>
          <p className="text-muted-foreground">
            Análise de leads por dia da semana
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={loading}
          >
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={loading}
          >
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={forceUpdate}
            disabled={isUpdating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Data Início</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Data Fim</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Fonte</label>
              <Select value={filters.source} onValueChange={(value) => setFilters(prev => ({ ...prev, source: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as fontes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as fontes</SelectItem>
                  {availableSources.map((source) => (
                    <SelectItem key={source} value={source}>{source}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Responsável</label>
              <Select value={filters.responsible} onValueChange={(value) => setFilters(prev => ({ ...prev, responsible: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os responsáveis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os responsáveis</SelectItem>
                  {availableResponsibles.map((responsible) => (
                    <SelectItem key={responsible} value={responsible}>{responsible}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Leads</p>
                <p className="text-2xl font-bold">{data.totalLeads}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Melhor Dia</p>
                <p className="text-2xl font-bold">{bestDay?.weekday || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{bestDay?.count || 0} leads</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pior Dia</p>
                <p className="text-2xl font-bold">{worstDay?.weekday || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">{worstDay?.count || 0} leads</p>
              </div>
              <Calendar className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Última Atualização</p>
                <p className="text-sm font-medium">
                  {lastUpdate ? format(lastUpdate, 'HH:mm:ss', { locale: ptBR }) : 'Nunca'}
                </p>
              </div>
              <Clock className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por Dia da Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.weekdayStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="weekday" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" label={{ position: 'top', fontSize: 12, fill: '#333' }} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição Percentual</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.weekdayStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ weekday, percentage }) => `${weekday}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.weekdayStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por Dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Dia da Semana</th>
                  <th className="text-right p-2">Quantidade</th>
                  <th className="text-right p-2">Percentual</th>
                  <th className="text-center p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.weekdayStats.map((day) => (
                  <tr key={day.day_number} className="border-b">
                    <td className="p-2 font-medium">{day.weekday}</td>
                    <td className="text-right p-2">{day.count}</td>
                    <td className="text-right p-2">{day.percentage}%</td>
                    <td className="text-center p-2">
                      <Badge 
                        variant={day.count === bestDay?.count ? "default" : 
                                day.count === worstDay?.count ? "destructive" : "secondary"}
                      >
                        {day.count === bestDay?.count ? "Melhor" : 
                         day.count === worstDay?.count ? "Pior" : "Normal"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadsWeekdayReport;